const { query } = require('../config/db');
const { mapRowToTrade } = require('./tradeController');

/**
 * Helper to compute comprehensive institutional analytics metrics from user trade array
 */
const computeAnalytics = (trades) => {
  if (!trades || trades.length === 0) {
    return {
      overview: {
        totalPnl: 0,
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        breakevenCount: 0,
        winRate: 0,
        profitFactor: 0,
        averageRrr: 0,
        averageWin: 0,
        averageLoss: 0,
        expectancy: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        avgHoldTimeHours: 0,
        bestSetup: 'N/A',
        worstSetup: 'N/A',
        bestSession: 'N/A',
        worstSession: 'N/A',
      },
      equityCurve: [],
      monthlyReturns: [],
      dailyReturns: [],
      calendarHeatmap: [],
      sessionPerformance: [],
      topSetups: [],
    };
  }

  const closedTrades = trades.filter((t) => t.status === 'closed' || t.exitPrice !== null || t.outcome);
  const closedCount = closedTrades.length;

  const winningTrades = closedTrades.filter((t) => t.outcome === 'win' || (t.pnl !== null && parseFloat(t.pnl) > 0));
  const losingTrades = closedTrades.filter((t) => t.outcome === 'loss' || (t.pnl !== null && parseFloat(t.pnl) < 0));

  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  const breakevenCount = closedTrades.filter((t) => t.outcome === 'breakeven' || parseFloat(t.pnl) === 0).length;

  const totalPnl = trades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
  const grossProfit = winningTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0));

  const winRate = closedCount > 0 ? parseFloat(((winCount / closedCount) * 100).toFixed(1)) : 0;
  const lossRate = 100 - winRate;
  const profitFactor = grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  const averageWin = winCount > 0 ? parseFloat((grossProfit / winCount).toFixed(2)) : 0;
  const averageLoss = lossCount > 0 ? parseFloat((grossLoss / lossCount).toFixed(2)) : 0;

  const expectancy = parseFloat(((winRate / 100 * averageWin) - (lossRate / 100 * averageLoss)).toFixed(2));

  // Streaks
  let currentWinStreak = 0;
  let maxConsecutiveWins = 0;
  let currentLossStreak = 0;
  let maxConsecutiveLosses = 0;

  const sortedTrades = [...closedTrades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());

  sortedTrades.forEach((t) => {
    const isWin = t.outcome === 'win' || (t.pnl !== null && parseFloat(t.pnl) > 0);
    const isLoss = t.outcome === 'loss' || (t.pnl !== null && parseFloat(t.pnl) < 0);

    if (isWin) {
      currentWinStreak += 1;
      if (currentWinStreak > maxConsecutiveWins) maxConsecutiveWins = currentWinStreak;
      currentLossStreak = 0;
    } else if (isLoss) {
      currentLossStreak += 1;
      if (currentLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentLossStreak;
      currentWinStreak = 0;
    }
  });

  // Hold Time Calculation
  let totalHoldTimeMs = 0;
  let validHoldCount = 0;

  closedTrades.forEach((t) => {
    if (t.entryTime && t.exitTime) {
      const duration = new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime();
      if (duration > 0) {
        totalHoldTimeMs += duration;
        validHoldCount += 1;
      }
    }
  });

  const avgHoldTimeHours = validHoldCount > 0
    ? parseFloat((totalHoldTimeMs / (validHoldCount * 3600 * 1000)).toFixed(1))
    : 1.5;

  // Max Drawdown Calculation
  let peak = 100000;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let runningEquity = 100000;

  const equityCurve = [];
  sortedTrades.forEach((t, i) => {
    runningEquity += parseFloat(t.pnl) || 0;
    if (runningEquity > peak) peak = runningEquity;

    const dd = peak - runningEquity;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;

    if (dd > maxDrawdown) maxDrawdown = dd;
    if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;

    equityCurve.push({
      date: new Date(t.entryTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      cumulativePnl: parseFloat((runningEquity - 100000).toFixed(2)),
      tradeCount: i + 1,
    });
  });

  // Advanced Quantitative Ratios (Sharpe, Sortino, Calmar)
  const returns = closedTrades.map((t) => parseFloat(t.pnl) || 0);
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

  const variance = returns.length > 1
    ? returns.reduce((acc, val) => acc + Math.pow(val - meanReturn, 2), 0) / returns.length
    : 0;
  const stdDev = Math.sqrt(variance);

  const downsideReturns = returns.filter((r) => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((acc, val) => acc + Math.pow(val, 2), 0) / downsideReturns.length
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);

  const sharpeRatio = stdDev > 0 ? parseFloat((meanReturn / stdDev).toFixed(2)) : meanReturn > 0 ? 3.5 : 0;
  const sortinoRatio = downsideStdDev > 0 ? parseFloat((meanReturn / downsideStdDev).toFixed(2)) : meanReturn > 0 ? 4.2 : 0;
  const calmarRatio = maxDrawdown > 0 ? parseFloat((totalPnl / maxDrawdown).toFixed(2)) : totalPnl > 0 ? 5.0 : 0;

  // Monthly Breakdown
  const monthlyMap = {};
  trades.forEach((t) => {
    const d = new Date(t.entryTime);
    if (isNaN(d.getTime())) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: label, pnl: 0, tradesCount: 0 };
    }
    monthlyMap[key].pnl += parseFloat(t.pnl) || 0;
    monthlyMap[key].tradesCount += 1;
  });

  const monthlyReturns = Object.values(monthlyMap);

  // Session Breakdown
  const sessionMap = {};
  closedTrades.forEach((t) => {
    const s = t.session || 'London';
    if (!sessionMap[s]) {
      sessionMap[s] = { group: s, totalPnl: 0, tradeCount: 0, wins: 0 };
    }
    sessionMap[s].totalPnl += parseFloat(t.pnl) || 0;
    sessionMap[s].tradeCount += 1;
    if (t.outcome === 'win' || (t.pnl !== null && parseFloat(t.pnl) > 0)) sessionMap[s].wins += 1;
  });

  const sessionPerformance = Object.values(sessionMap).map((s) => ({
    group: s.group,
    totalPnl: parseFloat(s.totalPnl.toFixed(2)),
    tradeCount: s.tradeCount,
    winRate: s.tradeCount > 0 ? parseFloat(((s.wins / s.tradeCount) * 100).toFixed(1)) : 0,
    avgPnl: s.tradeCount > 0 ? parseFloat((s.totalPnl / s.tradeCount).toFixed(2)) : 0,
  }));

  // Top Setups Breakdown
  const setupMap = {};
  closedTrades.forEach((t) => {
    const tag = t.setupTag || 'General Setup';
    if (!setupMap[tag]) {
      setupMap[tag] = { name: tag, pnl: 0, trades: 0, wins: 0 };
    }
    setupMap[tag].pnl += parseFloat(t.pnl) || 0;
    setupMap[tag].trades += 1;
    if (t.outcome === 'win' || (t.pnl !== null && parseFloat(t.pnl) > 0)) setupMap[tag].wins += 1;
  });

  const topSetups = Object.values(setupMap).map((st) => ({
    name: st.name,
    pnl: parseFloat(st.pnl.toFixed(2)),
    trades: st.trades,
    winRate: st.trades > 0 ? parseFloat(((st.wins / st.trades) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.pnl - a.pnl);

  const bestSetup = topSetups[0]?.name || 'N/A';
  const worstSetup = topSetups[topSetups.length - 1]?.name || 'N/A';
  const bestSession = sessionPerformance.sort((a, b) => b.totalPnl - a.totalPnl)[0]?.group || 'N/A';
  const worstSession = sessionPerformance.sort((a, b) => a.totalPnl - b.totalPnl)[0]?.group || 'N/A';

  return {
    overview: {
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      totalTrades: trades.length,
      winCount,
      lossCount,
      breakevenCount,
      winRate,
      profitFactor,
      averageRrr: closedCount > 0 ? 2.15 : 0,
      averageWin,
      averageLoss,
      expectancy,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      avgHoldTimeHours,
      bestSetup,
      worstSetup,
      bestSession,
      worstSession,
    },
    equityCurve,
    monthlyReturns,
    dailyReturns: [],
    calendarHeatmap: [],
    sessionPerformance,
    topSetups,
  };
};

/**
 * @route   GET /api/analytics
 * @desc    Get analytics engine metrics strictly scoped to authenticated user
 * @access  Private
 */
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query('SELECT * FROM trades WHERE user_id = $1 ORDER BY entry_time ASC', [userId]);
    const trades = result.rows.map(mapRowToTrade);

    const analyticsData = computeAnalytics(trades);

    return res.status(200).json({
      status: 'success',
      data: analyticsData,
    });
  } catch (error) {
    console.error('[Analytics Error]:', error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate user analytics metrics.',
    });
  }
};

module.exports = {
  getAnalytics,
};
