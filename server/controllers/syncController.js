const crypto = require('crypto');
const { query } = require('../config/db');
const { mapRowToTrade } = require('./tradeController');

// Helper to determine asset class from symbol
const detectAssetClass = (symbol) => {
  if (!symbol) return 'forex';
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'BNB', 'AVAX'].some((c) => sym.includes(c))) {
    return 'crypto';
  }
  if (['US30', 'NAS100', 'US100', 'SPX500', 'SP500', 'GER30', 'GER40', 'UK100', 'JPN225', 'NDX'].some((i) => sym.includes(i))) {
    return 'indices';
  }
  if (['XAU', 'XAG', 'GOLD', 'SILVER', 'USOIL', 'UKOIL', 'WTI', 'BRENT', 'OIL'].some((cm) => sym.includes(cm))) {
    return 'commodities';
  }
  return 'forex';
};

// Helper to determine trading session from date
const detectSession = (dateStr) => {
  try {
    const d = new Date(dateStr);
    const hour = d.getUTCHours();

    if (hour >= 22 || hour < 7) return 'tokyo';
    if (hour >= 7 && hour < 12) return 'london';
    if (hour >= 12 && hour < 16) return 'overlap';
    if (hour >= 16 && hour < 21) return 'new_york';
    return 'sydney';
  } catch {
    return 'london';
  }
};

/**
 * Generate/Retrieve API Key for User MT5 Auto Sync
 */
const registerSyncKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { regenerate = false } = req.body;

    const existing = await query('SELECT * FROM broker_accounts WHERE user_id = $1', [userId]);

    let apiKey = '';
    let accountRow;

    if (existing.rows.length > 0 && !regenerate) {
      accountRow = existing.rows[0];
      apiKey = accountRow.api_key;
    } else {
      apiKey = `ttp_live_${crypto.randomBytes(24).toString('hex')}`;

      if (existing.rows.length > 0) {
        const updateResult = await query(
          `UPDATE broker_accounts SET api_key = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
          [apiKey, userId]
        );
        accountRow = updateResult.rows[0];
      } else {
        const insertResult = await query(
          `INSERT INTO broker_accounts (user_id, api_key, ea_version, is_connected)
           VALUES ($1, $2, '1.0.0', false) RETURNING *`,
          [userId, apiKey]
        );
        accountRow = insertResult.rows[0];
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        apiKey,
        accountNumber: accountRow.account_number || null,
        broker: accountRow.broker || null,
        server: accountRow.server || null,
        isConnected: accountRow.is_connected,
        lastSync: accountRow.last_sync,
        lastHeartbeat: accountRow.last_heartbeat,
        eaVersion: accountRow.ea_version || '1.0.0',
      },
    });
  } catch (error) {
    console.error('[Sync Register Error]:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to generate sync API key.' });
  }
};

/**
 * EA Heartbeat Ping
 */
const receiveHeartbeat = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({ status: 'error', message: 'Missing API Key in x-api-key header.' });
    }

    const accResult = await query('SELECT * FROM broker_accounts WHERE api_key = $1', [apiKey]);
    if (accResult.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid or revoked API Key.' });
    }

    const account = accResult.rows[0];
    const { accountNumber, broker, server, terminalId, eaVersion, currency } = req.body;

    await query(
      `UPDATE broker_accounts SET
       account_number = COALESCE($1, account_number),
       broker = COALESCE($2, broker),
       server = COALESCE($3, server),
       terminal_id = COALESCE($4, terminal_id),
       ea_version = COALESCE($5, ea_version),
       currency = COALESCE($6, currency),
       is_connected = true,
       last_heartbeat = NOW(),
       updated_at = NOW()
       WHERE id = $7`,
      [accountNumber, broker, server, terminalId, eaVersion, currency, account.id]
    );

    // Audit log
    await query(
      `INSERT INTO sync_logs (broker_account_id, event_type, message, details)
       VALUES ($1, 'Heartbeat', $2, $3)`,
      [account.id, `Heartbeat received from MT5 Account #${accountNumber || 'Unknown'}`, req.body]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Heartbeat received successfully',
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync Heartbeat Error]:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to process heartbeat.' });
  }
};

/**
 * EA Trade Sync Submission
 */
const syncTrade = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({ status: 'error', message: 'Missing API Key in x-api-key header.' });
    }

    const accResult = await query('SELECT * FROM broker_accounts WHERE api_key = $1', [apiKey]);
    if (accResult.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid API Key.' });
    }

    const account = accResult.rows[0];
    const tradeData = req.body;

    const ticket = String(tradeData.ticket || tradeData.positionId || '').trim();
    const symbol = String(tradeData.symbol || '').toUpperCase().trim();
    const directionStr = String(tradeData.direction || tradeData.type || 'buy').toLowerCase();
    const direction = directionStr.includes('sell') || directionStr.includes('short') ? 'short' : 'long';
    const volume = parseFloat(tradeData.volume || tradeData.lots || tradeData.lotSize) || 1.0;
    const entryPrice = parseFloat(tradeData.entryPrice || tradeData.openPrice) || 0;
    const exitPrice = parseFloat(tradeData.exitPrice || tradeData.closePrice) || entryPrice;
    const stopLoss = parseFloat(tradeData.stopLoss || tradeData.sl) || null;
    const takeProfit = parseFloat(tradeData.takeProfit || tradeData.tp) || null;
    const commission = Math.abs(parseFloat(tradeData.commission || tradeData.fees) || 0);
    const swap = parseFloat(tradeData.swap) || 0;
    const profit = parseFloat(tradeData.profit || tradeData.pnl) || 0;
    const entryTime = tradeData.entryTime || new Date().toISOString();
    const exitTime = tradeData.exitTime || new Date().toISOString();
    const accountNumber = tradeData.accountNumber || account.account_number || 'MT5 Account';
    const broker = tradeData.broker || account.broker || 'MetaTrader 5';

    if (!ticket || !symbol || entryPrice <= 0) {
      return res.status(400).json({ status: 'error', message: 'Missing required trade payload fields (ticket, symbol, entryPrice).' });
    }

    // ── 1. Check Duplicate in trade_sync_history ──
    const syncCheck = await query(
      'SELECT id FROM trade_sync_history WHERE broker_account_id = $1 AND ticket = $2',
      [account.id, ticket]
    );

    if (syncCheck.rows.length > 0) {
      console.log(`[Sync] Duplicate trade ticket #${ticket} ignored for account #${accountNumber}`);
      await query(
        `INSERT INTO sync_logs (broker_account_id, event_type, message, details)
         VALUES ($1, 'Duplicate Ignored', $2, $3)`,
        [account.id, `Ticket #${ticket} already synced for Account #${accountNumber}`, tradeData]
      );
      return res.status(200).json({ status: 'success', message: 'Trade ticket already synced', duplicate: true });
    }

    // ── 2. Check Duplicate in trades table ──
    const dupTradeCheck = await query(
      `SELECT id FROM trades WHERE user_id = $1 AND symbol = $2 AND entry_time = $3 AND lot_size = $4`,
      [account.user_id, symbol, entryTime, volume]
    );

    if (dupTradeCheck.rows.length > 0) {
      await query('INSERT INTO trade_sync_history (broker_account_id, ticket, symbol) VALUES ($1, $2, $3)', [account.id, ticket, symbol]);
      return res.status(200).json({ status: 'success', message: 'Trade execution already present in journal', duplicate: true });
    }

    // ── 3. Insert Trade into PostgreSQL ──
    const outcome = profit > 0 ? 'win' : profit < 0 ? 'loss' : 'breakeven';
    const cleanSym = symbol.replace(/[^A-Z0-9/]/gi, '');

    const insertResult = await query(
      `INSERT INTO trades
      (user_id, broker, account_name, symbol, asset_class, direction, entry_price, exit_price, lot_size, stop_loss, take_profit, risk_amount, reward_amount, risk_reward, entry_time, exit_time, fees, swap, pnl, outcome, emotion, rating, notes, session, setup_tag, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *`,
      [
        account.user_id,
        broker,
        `MT5 #${accountNumber}`,
        cleanSym,
        detectAssetClass(cleanSym),
        direction,
        entryPrice,
        exitPrice,
        volume,
        stopLoss > 0 ? stopLoss : null,
        takeProfit > 0 ? takeProfit : null,
        stopLoss > 0 ? Math.abs(entryPrice - stopLoss) * volume * 100 : null,
        takeProfit > 0 ? Math.abs(takeProfit - entryPrice) * volume * 100 : null,
        2.0,
        entryTime,
        exitTime,
        commission,
        swap,
        profit,
        outcome,
        'disciplined',
        5,
        `Auto Synced via MT5 EA (Ticket #${ticket})`,
        detectSession(entryTime),
        'MT5 Auto Sync',
        'closed',
      ]
    );

    // Record in sync history & update account status
    await query('INSERT INTO trade_sync_history (broker_account_id, ticket, symbol) VALUES ($1, $2, $3)', [account.id, ticket, symbol]);
    await query(
      `UPDATE broker_accounts SET last_sync = NOW(), is_connected = true, account_number = $1, broker = $2 WHERE id = $3`,
      [accountNumber, broker, account.id]
    );

    await query(
      `INSERT INTO sync_logs (broker_account_id, event_type, message, details)
       VALUES ($1, 'Trade Inserted', $2, $3)`,
      [account.id, `Successfully synced trade ticket #${ticket} (${cleanSym} ${direction} PnL: $${profit})`, tradeData]
    );

    const createdTrade = mapRowToTrade(insertResult.rows[0]);

    // ── 4. Broadcast Real-Time Event via Socket.IO ──
    const io = req.app.get('io');
    if (io) {
      io.emit('trade:synced', {
        userId: account.user_id,
        trade: createdTrade,
        message: `New trade synced: ${cleanSym} (${direction.toUpperCase()}) PnL: $${profit.toFixed(2)}`,
      });
    }

    console.log(`[Sync] ✅ Successfully synced MT5 trade ticket #${ticket} for user ${account.user_id}`);

    return res.status(201).json({
      status: 'success',
      message: 'Trade synced successfully.',
      data: { trade: createdTrade },
    });
  } catch (error) {
    console.error('[Sync Trade Error]:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to process trade sync.' });
  }
};

/**
 * Get Auto Sync Status for User Settings UI
 */
const getSyncStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const accResult = await query('SELECT * FROM broker_accounts WHERE user_id = $1', [userId]);
    if (accResult.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          hasAccount: false,
          isConnected: false,
          apiKey: null,
        },
      });
    }

    const account = accResult.rows[0];

    // Count trades synced today
    const syncedTodayResult = await query(
      `SELECT COUNT(*) as count FROM trade_sync_history
       WHERE broker_account_id = $1 AND created_at >= CURRENT_DATE`,
      [account.id]
    );

    const countToday = parseInt(syncedTodayResult.rows[0]?.count || 0, 10);

    return res.status(200).json({
      status: 'success',
      data: {
        hasAccount: true,
        apiKey: account.api_key,
        accountNumber: account.account_number || 'Not Connected',
        broker: account.broker || 'MetaTrader 5',
        server: account.server || 'Standard Live Server',
        terminalId: account.terminal_id || null,
        eaVersion: account.ea_version || '1.0.0',
        isConnected: account.is_connected && account.last_heartbeat && (Date.now() - new Date(account.last_heartbeat).getTime()) < 300000,
        lastSync: account.last_sync,
        lastHeartbeat: account.last_heartbeat,
        tradesSyncedToday: countToday,
      },
    });
  } catch (error) {
    console.error('[Get Sync Status Error]:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch sync status.' });
  }
};

module.exports = {
  registerSyncKey,
  receiveHeartbeat,
  syncTrade,
  getSyncStatus,
};
