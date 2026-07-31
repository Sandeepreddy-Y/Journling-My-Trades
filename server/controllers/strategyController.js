const { query, memoryDb, pool } = require('../config/db');

/**
 * Helper to calculate performance metrics for a specific strategy
 */
const calculateStrategyStats = (strategyId, strategyName, trades) => {
  const matchingTrades = trades.filter(
    (t) => t.strategyId === strategyId || (t.setupTag && t.setupTag.toLowerCase() === strategyName.toLowerCase())
  );

  const closedTrades = matchingTrades.filter((t) => t.status === 'closed' || t.exitPrice !== null || t.outcome);
  const totalTrades = matchingTrades.length;
  const closedCount = closedTrades.length;

  const winningTrades = closedTrades.filter((t) => t.outcome === 'win' || (t.pnl && parseFloat(t.pnl) > 0));
  const losingTrades = closedTrades.filter((t) => t.outcome === 'loss' || (t.pnl && parseFloat(t.pnl) < 0));

  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;

  const totalPnl = matchingTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
  const grossProfit = winningTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0));

  const winRate = closedCount > 0 ? parseFloat(((winCount / closedCount) * 100).toFixed(1)) : 0;
  const profitFactor = grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  const averageWin = winCount > 0 ? parseFloat((grossProfit / winCount).toFixed(2)) : 0;
  const averageLoss = lossCount > 0 ? parseFloat((grossLoss / lossCount).toFixed(2)) : 0;
  const lossRate = 100 - winRate;

  const expectancy = parseFloat(((winRate / 100 * averageWin) - (lossRate / 100 * averageLoss)).toFixed(2));

  // Sessions
  const sessionMap = {};
  closedTrades.forEach((t) => {
    const s = t.session || 'London';
    if (!sessionMap[s]) sessionMap[s] = 0;
    sessionMap[s] += parseFloat(t.pnl) || 0;
  });

  const sortedSessions = Object.entries(sessionMap).sort((a, b) => b[1] - a[1]);
  const bestSession = sortedSessions[0] ? sortedSessions[0][0] : 'N/A';
  const worstSession = sortedSessions[sortedSessions.length - 1] ? sortedSessions[sortedSessions.length - 1][0] : 'N/A';

  return {
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    totalTrades,
    winCount,
    lossCount,
    winRate,
    profitFactor,
    expectancy,
    averageWin,
    averageLoss,
    bestSession,
    worstSession,
  };
};

/**
 * @route   GET /api/strategies
 * @desc    Get user strategy library with live trade performance metrics
 * @access  Private
 */
const getStrategies = async (req, res) => {
  try {
    const userId = req.user.id;

    let strategies = [];
    let trades = [];

    if (pool) {
      const stratRes = await query('SELECT * FROM strategies WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      strategies = stratRes.rows;

      const tradeRes = await query('SELECT * FROM trades WHERE user_id = $1', [userId]);
      trades = tradeRes.rows;
    } else {
      if (!memoryDb.strategies) memoryDb.strategies = [];
      strategies = memoryDb.strategies.filter((s) => s.userId === userId);
      trades = (memoryDb.trades || []).filter((t) => t.userId === userId);
    }

    const enrichedStrategies = strategies.map((s) => {
      const stats = calculateStrategyStats(s.id, s.name, trades);
      return {
        ...s,
        stats,
      };
    });

    return res.status(200).json({
      status: 'success',
      data: { strategies: enrichedStrategies, total: enrichedStrategies.length },
    });
  } catch (error) {
    console.error('[Get Strategies Error]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch strategy library.' });
  }
};

/**
 * @route   POST /api/strategies
 * @desc    Create a new strategy in library
 * @access  Private
 */
const createStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, targetWinRate, targetRrr, assetClasses, rules, setupTags } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Strategy name is required.' });
    }

    const newStrategy = {
      id: `strat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      name: name.trim(),
      description: description || '',
      targetWinRate: parseFloat(targetWinRate || 65.0),
      targetRrr: parseFloat(targetRrr || 2.0),
      assetClasses: Array.isArray(assetClasses) ? assetClasses : ['forex', 'commodities'],
      rules: Array.isArray(rules) ? rules : [],
      setupTags: Array.isArray(setupTags) ? setupTags : [name.trim()],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (pool) {
      const result = await query(
        `INSERT INTO strategies
        (id, user_id, name, description, target_win_rate, target_rrr, asset_classes, rules, setup_tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          newStrategy.id,
          userId,
          newStrategy.name,
          newStrategy.description,
          newStrategy.targetWinRate,
          newStrategy.targetRrr,
          JSON.stringify(newStrategy.assetClasses),
          JSON.stringify(newStrategy.rules),
          JSON.stringify(newStrategy.setupTags),
        ]
      );
      newStrategy.id = result.rows[0].id;
    } else {
      if (!memoryDb.strategies) memoryDb.strategies = [];
      memoryDb.strategies.unshift(newStrategy);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Strategy created successfully.',
      data: { strategy: { ...newStrategy, stats: calculateStrategyStats(newStrategy.id, newStrategy.name, []) } },
    });
  } catch (error) {
    console.error('[Create Strategy Error]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to create strategy.' });
  }
};

/**
 * @route   DELETE /api/strategies/:id
 * @desc    Delete strategy from library
 * @access  Private
 */
const deleteStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (pool) {
      await query('DELETE FROM strategies WHERE id = $1 AND user_id = $2', [id, userId]);
    } else {
      if (memoryDb.strategies) {
        memoryDb.strategies = memoryDb.strategies.filter((s) => !(s.id === id && s.userId === userId));
      }
    }

    return res.status(200).json({ status: 'success', message: 'Strategy deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete strategy.' });
  }
};

module.exports = {
  getStrategies,
  createStrategy,
  deleteStrategy,
};
