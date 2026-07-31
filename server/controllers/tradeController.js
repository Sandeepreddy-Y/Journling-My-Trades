const { query } = require('../config/db');
const { parseStatementFile } = require('../utils/tradeParsers');

/**
 * Mapper: Converts PostgreSQL snake_case rows to frontend camelCase Trade objects
 */
const mapRowToTrade = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    broker: row.broker || 'MetaTrader 5',
    accountName: row.account_name || 'Standard Real Account',
    symbol: row.symbol,
    assetClass: row.asset_class || 'forex',
    direction: row.direction,
    entryPrice: parseFloat(row.entry_price),
    exitPrice: row.exit_price ? parseFloat(row.exit_price) : null,
    lotSize: row.lot_size ? parseFloat(row.lot_size) : null,
    stopLoss: row.stop_loss ? parseFloat(row.stop_loss) : null,
    takeProfit: row.take_profit ? parseFloat(row.take_profit) : null,
    riskAmount: row.risk_amount ? parseFloat(row.risk_amount) : null,
    rewardAmount: row.reward_amount ? parseFloat(row.reward_amount) : null,
    riskReward: row.risk_reward ? parseFloat(row.risk_reward) : null,
    beforeScreenshot: row.before_screenshot || null,
    afterScreenshot: row.after_screenshot || null,
    entryTime: row.entry_time,
    exitTime: row.exit_time || null,
    fees: parseFloat(row.fees || 0),
    swap: parseFloat(row.swap || 0),
    pnl: row.pnl !== null ? parseFloat(row.pnl) : null,
    pnlPips: row.pnl_pips !== null ? parseFloat(row.pnl_pips) : null,
    outcome: row.outcome || 'open',
    emotion: row.emotion || null,
    rating: row.rating ? parseInt(row.rating, 10) : null,
    notes: row.notes || '',
    session: row.session || null,
    setupTag: row.setup_tag || null,
    status: row.status || 'closed',
    screenshots: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Helper to compute PnL, Outcome, Risk:Reward
 */
const calculateTradeMetrics = (data) => {
  const entry = parseFloat(data.entryPrice) || 0;
  const exit = parseFloat(data.exitPrice) || null;
  const sl = parseFloat(data.stopLoss) || null;
  const tp = parseFloat(data.takeProfit) || null;
  const lots = parseFloat(data.lotSize) || 0;
  const direction = (data.direction || 'long').toLowerCase();

  let pnl = parseFloat(data.pnl) || 0;
  let outcome = data.outcome || 'open';

  let riskAmount = null;
  let rewardAmount = null;
  let riskReward = null;

  if (entry > 0 && sl > 0) {
    riskAmount = Math.abs(entry - sl) * lots * 100;
  }
  if (entry > 0 && tp > 0) {
    rewardAmount = Math.abs(tp - entry) * lots * 100;
  }
  if (riskAmount && rewardAmount && riskAmount > 0) {
    riskReward = parseFloat((rewardAmount / riskAmount).toFixed(2));
  }

  if (exit !== null && exit > 0 && entry > 0 && pnl === 0) {
    const isLong = direction === 'long' || direction === 'buy';
    const priceDiff = isLong ? exit - entry : entry - exit;
    pnl = priceDiff * lots * 100;

    if (data.fees) pnl -= parseFloat(data.fees);
    if (data.swap) pnl += parseFloat(data.swap);

    pnl = parseFloat(pnl.toFixed(2));
  }

  if (pnl > 0) outcome = 'win';
  else if (pnl < 0) outcome = 'loss';
  else if (exit !== null) outcome = 'breakeven';

  return {
    pnl,
    outcome,
    riskReward,
    riskAmount: riskAmount !== null ? parseFloat(riskAmount.toFixed(2)) : null,
    rewardAmount: rewardAmount !== null ? parseFloat(rewardAmount.toFixed(2)) : null,
  };
};

/**
 * Validate Trade Input Fields
 */
const validateTradeInput = (data) => {
  const errors = [];
  const { symbol, direction, entryPrice, lotSize } = data;

  if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
    errors.push('Symbol is required (e.g. XAU/USD, EUR/USD).');
  }

  if (!direction || !['long', 'short', 'buy', 'sell'].includes(String(direction).toLowerCase())) {
    errors.push('Direction must be Long/Buy or Short/Sell.');
  }

  if (entryPrice === undefined || entryPrice === null || isNaN(parseFloat(entryPrice)) || parseFloat(entryPrice) <= 0) {
    errors.push('Entry Price must be a valid positive number.');
  }

  if (lotSize === undefined || lotSize === null || isNaN(parseFloat(lotSize)) || parseFloat(lotSize) <= 0) {
    errors.push('Lot Size must be a valid positive number.');
  }

  return errors;
};

/**
 * @route   POST /api/trades
 * @desc    Create a new trade execution for the authenticated user
 * @access  Private
 */
const createTrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const errors = validateTradeInput(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ status: 'error', message: errors[0], errors });
    }

    const computed = calculateTradeMetrics(req.body);

    const broker = req.body.broker || 'MetaTrader 5';
    const accountName = req.body.accountName || req.body.account || 'Standard Real Account';
    const symbol = req.body.symbol.toUpperCase().trim();
    const assetClass = req.body.assetClass || 'forex';
    const direction = (req.body.direction || 'long').toLowerCase();
    const entryPrice = parseFloat(req.body.entryPrice);
    const exitPrice = req.body.exitPrice ? parseFloat(req.body.exitPrice) : null;
    const lotSize = parseFloat(req.body.lotSize);
    const stopLoss = req.body.stopLoss ? parseFloat(req.body.stopLoss) : null;
    const takeProfit = req.body.takeProfit ? parseFloat(req.body.takeProfit) : null;
    const entryTime = req.body.entryTime || req.body.date || new Date().toISOString();
    const exitTime = req.body.exitTime || null;
    const fees = parseFloat(req.body.commission || req.body.fees || 0);
    const swap = parseFloat(req.body.swap || 0);
    const emotion = req.body.emotion || 'disciplined';
    const rating = parseInt(req.body.rating || 5, 10);
    const notes = req.body.notes || '';
    const session = req.body.session || 'london';
    const setupTag = req.body.setup || req.body.setupTag || 'General Setup';
    const beforeScreenshot = req.body.beforeScreenshot || null;
    const afterScreenshot = req.body.afterScreenshot || null;
    const status = req.body.exitPrice ? 'closed' : 'open';

    const result = await query(
      `INSERT INTO trades
      (user_id, broker, account_name, symbol, asset_class, direction, entry_price, exit_price, lot_size, stop_loss, take_profit, risk_amount, reward_amount, risk_reward, before_screenshot, after_screenshot, entry_time, exit_time, fees, swap, pnl, outcome, emotion, rating, notes, session, setup_tag, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        userId,
        broker,
        accountName,
        symbol,
        assetClass,
        direction,
        entryPrice,
        exitPrice,
        lotSize,
        stopLoss,
        takeProfit,
        computed.riskAmount,
        computed.rewardAmount,
        computed.riskReward,
        beforeScreenshot,
        afterScreenshot,
        entryTime,
        exitTime,
        fees,
        swap,
        computed.pnl,
        computed.outcome,
        emotion,
        rating,
        notes,
        session,
        setupTag,
        status,
      ]
    );

    const createdTrade = mapRowToTrade(result.rows[0]);

    return res.status(201).json({
      status: 'success',
      message: 'Trade logged successfully.',
      data: { trade: createdTrade },
    });
  } catch (error) {
    console.error('[Create Trade Error]:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to create trade execution.' });
  }
};

/**
 * @route   GET /api/trades
 * @desc    Fetch trades strictly belonging to the authenticated user
 * @access  Private
 */
const getTrades = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, direction, outcome, session, assetClass } = req.query;

    const result = await query('SELECT * FROM trades WHERE user_id = $1 ORDER BY entry_time DESC', [userId]);
    const trades = result.rows.map(mapRowToTrade);

    let filtered = [...trades];

    if (symbol) {
      filtered = filtered.filter((t) => t.symbol.toLowerCase().includes(symbol.toLowerCase()));
    }
    if (direction && direction !== 'all') {
      filtered = filtered.filter((t) => t.direction === direction);
    }
    if (outcome && outcome !== 'all') {
      filtered = filtered.filter((t) => t.outcome === outcome);
    }
    if (session && session !== 'all') {
      filtered = filtered.filter((t) => t.session === session);
    }
    if (assetClass && assetClass !== 'all') {
      filtered = filtered.filter((t) => t.assetClass === assetClass);
    }

    return res.status(200).json({
      status: 'success',
      data: {
        trades: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    console.error('[Get Trades Error]:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch trade log.' });
  }
};

/**
 * @route   GET /api/trades/:id
 * @desc    Get trade details strictly belonging to the authenticated user
 * @access  Private
 */
const getTradeById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query('SELECT * FROM trades WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Trade execution record not found.' });
    }

    const trade = mapRowToTrade(result.rows[0]);
    return res.status(200).json({ status: 'success', data: { trade } });
  } catch (error) {
    console.error('[Get Trade By ID Error]:', error.message);
    return res.status(500).json({ status: 'error', message: 'Error fetching trade record.' });
  }
};

/**
 * @route   PUT /api/trades/:id
 * @desc    Update trade strictly belonging to the authenticated user
 * @access  Private
 */
const updateTrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingResult = await query('SELECT * FROM trades WHERE id = $1 AND user_id = $2', [id, userId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Trade record not found.' });
    }

    const existing = mapRowToTrade(existingResult.rows[0]);
    const updatedData = { ...existing, ...req.body };
    const computed = calculateTradeMetrics(updatedData);

    const updateResult = await query(
      `UPDATE trades SET
       symbol=$1, direction=$2, entry_price=$3, exit_price=$4, lot_size=$5, stop_loss=$6, take_profit=$7,
       pnl=$8, outcome=$9, emotion=$10, rating=$11, notes=$12, session=$13, setup_tag=$14, updated_at=NOW()
       WHERE id=$15 AND user_id=$16
       RETURNING *`,
      [
        updatedData.symbol,
        updatedData.direction,
        updatedData.entryPrice,
        updatedData.exitPrice,
        updatedData.lotSize,
        updatedData.stopLoss,
        updatedData.takeProfit,
        computed.pnl,
        computed.outcome,
        updatedData.emotion,
        updatedData.rating,
        updatedData.notes,
        updatedData.session,
        updatedData.setupTag,
        id,
        userId,
      ]
    );

    const updatedTrade = mapRowToTrade(updateResult.rows[0]);
    return res.status(200).json({ status: 'success', data: { trade: updatedTrade } });
  } catch (error) {
    console.error('[Update Trade Error]:', error.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update trade record.' });
  }
};

/**
 * @route   DELETE /api/trades/:id
 * @desc    Delete trade strictly belonging to the authenticated user
 * @access  Private
 */
const deleteTrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query('DELETE FROM trades WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Trade not found or already deleted.' });
    }

    return res.status(200).json({ status: 'success', message: 'Trade execution deleted successfully.' });
  } catch (error) {
    console.error('[Delete Trade Error]:', error.message);
    return res.status(500).json({ status: 'error', message: 'Failed to delete trade execution.' });
  }
};

/**
 * @route   POST /api/trades/import
 * @desc    Import statement trades strictly scoped to authenticated user
 * @access  Private
 */
const importTrades = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[TradeImport] --------------------------------------------------');
    console.log('[TradeImport] Start processing statement import for user:', userId);

    if (!req.file || !req.file.buffer) {
      console.log('[TradeImport] ❌ Error: No file attached in request payload');
      return res.status(400).json({
        status: 'error',
        message: 'No file received. Please attach a valid MT4/MT5/cTrader statement file (.csv or .html).',
      });
    }

    // 1. File Received Verification & Detailed Logging
    console.log('[TradeImport] req.file object:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer ? req.file.buffer.length : 0,
    });

    const filename = req.file.originalname;

    // 2. Parse Statement File with Format & Parser Detection
    let parseResult;
    try {
      parseResult = parseStatementFile(req.file.buffer, filename);
    } catch (parseErr) {
      console.error(`[TradeImport Parsing Failure]: ${parseErr.message}`);
      console.error('[TradeImport Stack Trace]:', parseErr.stack);
      return res.status(400).json({
        status: 'error',
        message: parseErr.message,
      });
    }

    const { detectedType, parserSelected, trades: parsedTrades } = parseResult;
    console.log(`[TradeImport] File type detected: ${detectedType}`);
    console.log(`[TradeImport] Parser selected: ${parserSelected}`);
    console.log(`[TradeImport] Number of trades detected: ${parsedTrades.length}`);

    let importedCount = 0;
    let duplicateCount = 0;
    let totalImportedPnl = 0;
    const insertedTrades = [];

    for (const item of parsedTrades) {
      const computedPnl = parseFloat(item.pnl) || 0;

      // Duplicate Detection Logging
      const dupCheck = await query(
        `SELECT id FROM trades
         WHERE user_id = $1 AND symbol = $2 AND entry_time = $3 AND lot_size = $4`,
        [userId, item.symbol, item.entryTime, item.lotSize]
      );

      const isDuplicate = dupCheck.rows.length > 0;
      console.log(`[TradeImport] Duplicate check (Ticket: ${item.ticket}, Symbol: ${item.symbol}, EntryTime: ${item.entryTime}, LotSize: ${item.lotSize}) => Is Duplicate: ${isDuplicate ? 'YES' : 'NO'}`);

      if (isDuplicate) {
        duplicateCount += 1;
        console.log(`[TradeImport] Skipped duplicate trade (Ticket: ${item.ticket}, Symbol: ${item.symbol}, EntryTime: ${item.entryTime}, LotSize: ${item.lotSize})`);
        continue;
      }

      // Insert into PostgreSQL with unsuppressed SQL error handling
      try {
        const insertResult = await query(
          `INSERT INTO trades
          (user_id, broker, account_name, symbol, asset_class, direction, entry_price, exit_price, lot_size, stop_loss, take_profit, risk_amount, reward_amount, risk_reward, entry_time, exit_time, fees, swap, pnl, outcome, emotion, rating, notes, session, setup_tag, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
          RETURNING *`,
          [
            userId,
            item.broker || 'Statement Import',
            'Imported Statement Account',
            item.symbol,
            item.assetClass || 'forex',
            item.direction,
            item.entryPrice,
            item.exitPrice,
            item.lotSize,
            item.stopLoss,
            item.takeProfit,
            item.stopLoss ? Math.abs(item.entryPrice - item.stopLoss) * item.lotSize * 100 : null,
            item.takeProfit ? Math.abs(item.takeProfit - item.entryPrice) * item.lotSize * 100 : null,
            2.0,
            item.entryTime,
            item.exitTime,
            item.fees || 0,
            item.swap || 0,
            computedPnl,
            item.outcome || (computedPnl > 0 ? 'win' : computedPnl < 0 ? 'loss' : 'breakeven'),
            'disciplined',
            5,
            `Imported from ${filename} on ${new Date().toLocaleDateString()}`,
            item.session || 'london',
            item.setupTag || 'Statement Import',
            'closed',
          ]
        );

        const mapped = mapRowToTrade(insertResult.rows[0]);
        insertedTrades.push(mapped);
        importedCount += 1;
        totalImportedPnl += computedPnl;
      } catch (sqlErr) {
        console.error(`[TradeImport Database Insert Error]: ${sqlErr.message}`, sqlErr.stack);
        throw new Error(`Database insert failure for symbol ${item.symbol}: ${sqlErr.message}`);
      }
    }

    console.log(`[TradeImport] Summary: Rows Found = ${parsedTrades.length}, Rows Parsed = ${parsedTrades.length}, Rows Skipped = ${duplicateCount}, Rows Imported = ${importedCount}`);
    console.log(`[TradeImport] Total PnL imported: $${totalImportedPnl.toFixed(2)}`);
    console.log('[TradeImport] --------------------------------------------------');

    return res.status(200).json({
      status: 'success',
      message: `Successfully imported ${importedCount} trade executions into your database (${duplicateCount} duplicates skipped).`,
      data: {
        importedCount,
        duplicateCount,
        totalPnl: parseFloat(totalImportedPnl.toFixed(2)),
        trades: insertedTrades,
      },
    });
  } catch (error) {
    console.error('[TradeImport Exception]:', error.message);
    console.error('[TradeImport Full Stack Trace]:', error.stack);
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/trades/:id/screenshots
 * @desc    Attach screenshot strictly belonging to the authenticated user
 * @access  Private
 */
const uploadScreenshot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { url, timeframe = '15M', caption = '' } = req.body;

    const result = await query(
      `INSERT INTO trade_screenshots (trade_id, url, timeframe, caption)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, url || '', timeframe, caption]
    );

    return res.status(200).json({ status: 'success', data: { screenshot: result.rows[0] } });
  } catch (error) {
    console.error('[Upload Screenshot Error]:', error.message);
    return res.status(500).json({ status: 'error', message: 'Failed to upload screenshot.' });
  }
};

module.exports = {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
  uploadScreenshot,
  importTrades,
  mapRowToTrade,
};
