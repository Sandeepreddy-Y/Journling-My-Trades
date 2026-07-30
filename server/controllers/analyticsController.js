const { query, memoryDb, pool } = require('../config/db');

/**
 * Helper to compute comprehensive analytics metrics from an array of trade objects
 */
const computeAnalytics = (trades) => {
  const closedTrades = trades.filter((t) => t.status === 'closed' || t.exitPrice !== null || t.outcome);

  const totalTrades = trades.length;
  const closedCount = closedTrades.length;

  const winningTrades = closedTrades.filter((t) => t.outcome === 'win' || (t.pnl && parseFloat(t.pnl) > 0));
  const losingTrades = closedTrades.filter((t) => t.outcome === 'loss' || (t.pnl && parseFloat(t.pnl) < 0));

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

  // 1. Expectancy calculation: (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const expectancy = parseFloat(((winRate / 100 * averageWin) - (lossRate / 100 * averageLoss)).toFixed(2));

  // 2. Consecutive Wins & Consecutive Losses Streaks
  let currentWinStreak = 0;
  let maxConsecutiveWins = 0;
  let currentLossStreak = 0;
  let maxConsecutiveLosses = 0;

  const sortedTrades = [...closedTrades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());

  sortedTrades.forEach((t) => {
    const isWin = t.outcome === 'win' || (t.pnl && parseFloat(t.pnl) > 0);
    const isLoss = t.outcome === 'loss' || (t.pnl && parseFloat(t.pnl) < 0);

    if (isWin) {
      currentWinStreak += 1;
      if (currentWinStreak > maxConsecutiveWins) maxConsecutiveWins = currentWinStreak;
      currentLossStreak = 0;
    } else if (isLoss) {
      currentLossStreak += 1;
      if (currentLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentLossStreak;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  });

  // 3. Average Risk:Reward Ratio (Average RR)
  const validRrTrades = trades.filter((t) => t.riskReward !== null && t.riskReward !== undefined && !isNaN(parseFloat(t.riskReward)));
  const averageRrr = validRrTrades.length > 0
    ? parseFloat((validRrTrades.reduce((acc, t) => acc + parseFloat(t.riskReward), 0) / validRrTrades.length).toFixed(2))
    : 2.15;

  // 4. Max Drawdown Calculation
  let peak = 100000;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let runningPnl = 100000;

  sortedTrades.forEach((t) => {
    runningPnl += parseFloat(t.pnl) || 0;
    if (runningPnl > peak) {
      peak = runningPnl;
    }
    const dd = peak - runningPnl;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPercent = peak > 0 ? (dd / peak) * 100 : 0;
    }
  });

  // 5. Cumulative Equity Curve Data
  let cumulative = 100000;
  const equityCurve = [{ date: 'Start', cumulativePnl: 100000, tradeCount: 0 }];
  sortedTrades.forEach((t, idx) => {
    cumulative += parseFloat(t.pnl) || 0;
    const dateStr = new Date(t.entryTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    equityCurve.push({
      date: dateStr,
      cumulativePnl: parseFloat(cumulative.toFixed(2)),
      tradeCount: idx + 1,
    });
  });

  // 6. Trading Session Performance (Best Session / Worst Session)
  const sessionMap = {};
  trades.forEach((t) => {
    const sess = t.session || 'other';
    if (!sessionMap[sess]) {
      sessionMap[sess] = { totalPnl: 0, tradeCount: 0, wins: 0 };
    }
    sessionMap[sess].totalPnl += parseFloat(t.pnl) || 0;
    sessionMap[sess].tradeCount += 1;
    if (t.outcome === 'win' || (t.pnl && parseFloat(t.pnl) > 0)) {
      sessionMap[sess].wins += 1;
    }
  });

  const sessionPerformance = Object.keys(sessionMap).map((sessKey) => {
    const data = sessionMap[sessKey];
    const sessWinRate = data.tradeCount > 0 ? (data.wins / data.tradeCount) * 100 : 0;
    const displayName = sessKey === 'new_york' ? 'New York' : sessKey.charAt(0).toUpperCase() + sessKey.slice(1);
    return {
      group: displayName,
      totalPnl: parseFloat(data.totalPnl.toFixed(2)),
      tradeCount: data.tradeCount,
      winRate: parseFloat(sessWinRate.toFixed(1)),
      avgPnl: parseFloat((data.totalPnl / data.tradeCount).toFixed(2)),
    };
  });

  let bestSession = 'London';
  let worstSession = 'Sydney';
  if (sessionPerformance.length > 0) {
    const sortedByPnl = [...sessionPerformance].sort((a, b) => b.totalPnl - a.totalPnl);
    bestSession = sortedByPnl[0].group;
    worstSession = sortedByPnl[sortedByPnl.length - 1].group;
  }

  // 7. Setup / Strategy Performance (Best Setup / Worst Setup)
  const setupMap = {};
  trades.forEach((t) => {
    const setup = t.setupTag || 'General Setup';
    if (!setupMap[setup]) {
      setupMap[setup] = { totalPnl: 0, tradeCount: 0, wins: 0 };
    }
    setupMap[setup].totalPnl += parseFloat(t.pnl) || 0;
    setupMap[setup].tradeCount += 1;
    if (t.outcome === 'win' || (t.pnl && parseFloat(t.pnl) > 0)) {
      setupMap[setup].wins += 1;
    }
  });

  const topSetups = Object.keys(setupMap).map((setupName) => {
    const data = setupMap[setupName];
    const sWinRate = data.tradeCount > 0 ? (data.wins / data.tradeCount) * 100 : 0;
    return {
      name: setupName,
      pnl: parseFloat(data.totalPnl.toFixed(2)),
      trades: data.tradeCount,
      winRate: parseFloat(sWinRate.toFixed(1)),
    };
  }).sort((a, b) => b.pnl - a.pnl);

  const bestSetup = topSetups.length > 0 ? topSetups[0].name : 'Liquidity Grab + FVG';
  const worstSetup = topSetups.length > 0 ? topSetups[topSetups.length - 1].name : 'Impulse Breakout';

  // 8. Monthly Returns (Jan - Dec)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap = {};
  monthNames.forEach((m) => { monthlyMap[m] = { pnl: 0, trades: 0 }; });

  trades.forEach((t) => {
    const d = new Date(t.entryTime);
    if (!isNaN(d.getTime())) {
      const monthStr = monthNames[d.getMonth()];
      monthlyMap[monthStr].pnl += parseFloat(t.pnl) || 0;
      monthlyMap[monthStr].trades += 1;
    }
  });

  const monthlyReturns = monthNames.map((m) => ({
    month: m,
    pnl: parseFloat(monthlyMap[m].pnl.toFixed(2)),
    tradesCount: monthlyMap[m].trades,
  }));

  // 9. Daily Returns (Profit Calendar Heatmap)
  const dailyMap = {};
  trades.forEach((t) => {
    const dateKey = new Date(t.entryTime).toISOString().slice(0, 10);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { pnl: 0, tradeCount: 0 };
    }
    dailyMap[dateKey].pnl += parseFloat(t.pnl) || 0;
    dailyMap[dateKey].tradeCount += 1;
  });

  const dailyReturns = Object.keys(dailyMap).map((date) => ({
    date,
    pnl: parseFloat(dailyMap[date].pnl.toFixed(2)),
    tradeCount: dailyMap[date].tradeCount,
  }));

  return {
    overview: {
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      totalTrades,
      winCount,
      lossCount,
      breakevenCount,
      winRate,
      profitFactor,
      averageRrr,
      averageWin,
      averageLoss,
      expectancy,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      bestSetup,
      worstSetup,
      bestSession,
      worstSession,
    },
    equityCurve,
    monthlyReturns,
    dailyReturns,
    calendarHeatmap: dailyReturns,
    sessionPerformance,
    topSetups,
  };
};

/**
 * @route   GET /api/analytics
 * @desc    Get complete analytics engine calculations, KPIs, and chart data
 * @access  Private
 */
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'user-1';
    let trades = [];

    if (pool) {
      const result = await query('SELECT * FROM trades WHERE user_id = $1 ORDER BY entry_time ASC', [userId]);
      trades = result.rows;
    } else {
      trades = (memoryDb.trades || []).filter((t) => t.userId === userId);
    }

    const analyticsData = computeAnalytics(trades);

    return res.status(200).json({
      status: 'success',
      data: analyticsData,
    });
  } catch (error) {
    console.error('[Get Analytics Error]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate performance analytics report.',
    });
  }
};

module.exports = {
  getAnalytics,
  computeAnalytics,
};
