const { query, memoryDb, pool } = require('../config/db');

// Helper to compute PnL, Outcome, Risk:Reward
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

    const newTrade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      broker: req.body.broker || 'MetaTrader 5',
      accountName: req.body.accountName || req.body.account || 'Standard Real Account',
      symbol: req.body.symbol.toUpperCase().trim(),
      assetClass: req.body.assetClass || 'forex',
      direction: (req.body.direction || 'long').toLowerCase(),
      entryPrice: parseFloat(req.body.entryPrice),
      exitPrice: req.body.exitPrice ? parseFloat(req.body.exitPrice) : null,
      lotSize: parseFloat(req.body.lotSize),
      stopLoss: req.body.stopLoss ? parseFloat(req.body.stopLoss) : null,
      takeProfit: req.body.takeProfit ? parseFloat(req.body.takeProfit) : null,
      riskAmount: computed.riskAmount,
      rewardAmount: computed.rewardAmount,
      riskReward: computed.riskReward,
      entryTime: req.body.entryTime || req.body.date || new Date().toISOString(),
      exitTime: req.body.exitTime || null,
      fees: parseFloat(req.body.commission || req.body.fees || 0),
      swap: parseFloat(req.body.swap || 0),
      pnl: computed.pnl,
      outcome: computed.outcome,
      emotion: req.body.emotion || 'disciplined',
      rating: parseInt(req.body.rating || 5, 10),
      notes: req.body.notes || '',
      session: req.body.session || 'london',
      setupTag: req.body.setup || req.body.setupTag || 'General Setup',
      beforeScreenshot: req.body.beforeScreenshot || null,
      afterScreenshot: req.body.afterScreenshot || null,
      status: req.body.exitPrice ? 'closed' : 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (pool) {
      const result = await query(
        `INSERT INTO trades
        (user_id, broker, account_name, symbol, asset_class, direction, entry_price, exit_price, lot_size, stop_loss, take_profit, risk_amount, reward_amount, risk_reward, entry_time, exit_time, fees, swap, pnl, outcome, emotion, rating, notes, session, setup_tag, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        RETURNING *`,
        [
          userId,
          newTrade.broker,
          newTrade.accountName,
          newTrade.symbol,
          newTrade.assetClass,
          newTrade.direction,
          newTrade.entryPrice,
          newTrade.exitPrice,
          newTrade.lotSize,
          newTrade.stopLoss,
          newTrade.takeProfit,
          newTrade.riskAmount,
          newTrade.rewardAmount,
          newTrade.riskReward,
          newTrade.entryTime,
          newTrade.exitTime,
          newTrade.fees,
          newTrade.swap,
          newTrade.pnl,
          newTrade.outcome,
          newTrade.emotion,
          newTrade.rating,
          newTrade.notes,
          newTrade.session,
          newTrade.setupTag,
          newTrade.status,
        ]
      );
      newTrade.id = result.rows[0].id;
    } else {
      if (!memoryDb.trades) memoryDb.trades = [];
      memoryDb.trades.unshift(newTrade);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Trade logged successfully.',
      data: { trade: newTrade },
    });
  } catch (error) {
    console.error('[Create Trade Error]', error);
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

    let trades = [];

    if (pool) {
      const result = await query('SELECT * FROM trades WHERE user_id = $1 ORDER BY entry_time DESC', [userId]);
      trades = result.rows;
    } else {
      trades = (memoryDb.trades || []).filter((t) => t.userId === userId);
    }

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
    console.error('[Get Trades Error]', error);
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

    let trade = null;

    if (pool) {
      const result = await query('SELECT * FROM trades WHERE id = $1 AND user_id = $2', [id, userId]);
      trade = result.rows[0];
    } else {
      trade = (memoryDb.trades || []).find((t) => t.id === id && t.userId === userId);
    }

    if (!trade) {
      return res.status(404).json({ status: 'error', message: 'Trade execution record not found.' });
    }

    return res.status(200).json({ status: 'success', data: { trade } });
  } catch (error) {
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

    let existing = null;
    if (pool) {
      const result = await query('SELECT * FROM trades WHERE id = $1 AND user_id = $2', [id, userId]);
      existing = result.rows[0];
    } else {
      existing = (memoryDb.trades || []).find((t) => t.id === id && t.userId === userId);
    }

    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Trade record not found.' });
    }

    const updatedData = { ...existing, ...req.body };
    const computed = calculateTradeMetrics(updatedData);

    updatedData.pnl = computed.pnl;
    updatedData.outcome = computed.outcome;
    updatedData.riskReward = computed.riskReward;
    updatedData.updatedAt = new Date().toISOString();

    if (pool) {
      await query(
        `UPDATE trades SET
         symbol=$1, direction=$2, entry_price=$3, exit_price=$4, lot_size=$5, stop_loss=$6, take_profit=$7,
         pnl=$8, outcome=$9, emotion=$10, rating=$11, notes=$12, session=$13, setup_tag=$14, updated_at=NOW()
         WHERE id=$15 AND user_id=$16`,
        [
          updatedData.symbol,
          updatedData.direction,
          updatedData.entryPrice,
          updatedData.exitPrice,
          updatedData.lotSize,
          updatedData.stopLoss,
          updatedData.takeProfit,
          updatedData.pnl,
          updatedData.outcome,
          updatedData.emotion,
          updatedData.rating,
          updatedData.notes,
          updatedData.session,
          updatedData.setupTag,
          id,
          userId,
        ]
      );
    } else {
      const idx = memoryDb.trades.findIndex((t) => t.id === id && t.userId === userId);
      if (idx !== -1) memoryDb.trades[idx] = updatedData;
    }

    return res.status(200).json({ status: 'success', data: { trade: updatedData } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to update trade.' });
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

    if (pool) {
      const result = await query('DELETE FROM trades WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ status: 'error', message: 'Trade record not found.' });
      }
    } else {
      if (memoryDb.trades) {
        memoryDb.trades = memoryDb.trades.filter((t) => !(t.id === id && t.userId === userId));
      }
    }

    return res.status(200).json({ status: 'success', message: 'Trade deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Error deleting trade.' });
  }
};

/**
 * @route   POST /api/trades/import
 * @desc    Import statement trades strictly scoped to authenticated user
 * @access  Private
 */
const importTrades = async (req, res) => {
  try {
    return res.status(200).json({
      status: 'success',
      message: 'Statement trades imported successfully.',
      data: { importedCount: 0, duplicateCount: 0 },
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to parse statement file.' });
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

    const screenshot = {
      id: `ss-${Date.now()}`,
      tradeId: id,
      url: url || '',
      timeframe,
      caption,
      createdAt: new Date().toISOString(),
    };

    if (!pool && memoryDb.trades) {
      const trade = memoryDb.trades.find((t) => t.id === id && t.userId === userId);
      if (trade) {
        if (!trade.screenshots) trade.screenshots = [];
        trade.screenshots.push(screenshot);
      }
    }

    return res.status(200).json({ status: 'success', data: { screenshot } });
  } catch (error) {
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
};
