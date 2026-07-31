const { query } = require('../config/db');

/**
 * Helper to compute prop firm account metrics from PostgreSQL trades
 */
const mapAccountToPropFirmData = async (acc, userId) => {
  const initialBal = parseFloat(acc.initial_balance) || 100000;

  // Fetch trades for this account or general user trades
  const tradesResult = await query(
    `SELECT pnl, entry_time::date as trade_date, exit_time
     FROM trades
     WHERE user_id = $1 AND (account_id = $2 OR account_name = $3 OR $2 IS NULL)
     ORDER BY entry_time ASC`,
    [userId, acc.id, acc.account_name]
  );

  let totalPnl = 0;
  let todayLoss = 0;
  let peakBalance = initialBal;
  let maxDrawdownVal = 0;
  let bestSingleDayProfit = 0;
  const distinctDays = new Set();
  const dailyPnlMap = {};

  const todayStr = new Date().toISOString().split('T')[0];

  for (const t of tradesResult.rows) {
    const pnl = parseFloat(t.pnl) || 0;
    totalPnl += pnl;

    const currentBal = initialBal + totalPnl;
    if (currentBal > peakBalance) {
      peakBalance = currentBal;
    }
    const drawdown = peakBalance - currentBal;
    if (drawdown > maxDrawdownVal) {
      maxDrawdownVal = drawdown;
    }

    if (t.trade_date) {
      const dateKey = String(t.trade_date).split('T')[0];
      distinctDays.add(dateKey);
      dailyPnlMap[dateKey] = (dailyPnlMap[dateKey] || 0) + pnl;

      if (dateKey === todayStr && pnl < 0) {
        todayLoss += Math.abs(pnl);
      }
    }
  }

  for (const dateKey in dailyPnlMap) {
    if (dailyPnlMap[dateKey] > bestSingleDayProfit) {
      bestSingleDayProfit = dailyPnlMap[dateKey];
    }
  }

  const currentBalance = initialBal + totalPnl;
  const profitTargetPercent = parseFloat(acc.profit_target) || 10.0;
  const maxDailyLossPercent = parseFloat(acc.max_daily_drawdown_percent) || 5.0;
  const maxTotalDrawdownPercent = parseFloat(acc.max_total_drawdown_percent) || 10.0;

  return {
    id: acc.id,
    firmName: acc.prop_firm_name || acc.broker || 'FTMO',
    accountName: acc.account_name,
    accountSize: initialBal,
    currentBalance: parseFloat(currentBalance.toFixed(2)),
    startingBalance: initialBal,
    phase: acc.account_type === 'challenge' ? 'challenge' : 'funded',
    status: acc.status || 'active',
    maxDailyLossPercent,
    currentDailyLoss: parseFloat(todayLoss.toFixed(2)),
    maxTotalDrawdownPercent,
    currentTotalDrawdown: parseFloat(maxDrawdownVal.toFixed(2)),
    profitTargetPercent,
    currentProfit: parseFloat(totalPnl.toFixed(2)),
    minTradingDays: 5,
    tradingDaysCompleted: distinctDays.size,
    bestDayProfit: parseFloat(bestSingleDayProfit.toFixed(2)),
    payoutCountdownDays: 14,
    createdAt: acc.created_at,
  };
};

/**
 * Default sample prop firm accounts for initial user onboarding
 */
const seedDefaultPropAccounts = async (userId) => {
  const defaults = [
    {
      firmName: 'FTMO',
      accountName: 'FTMO $100k Challenge',
      accountSize: 100000,
      maxDailyLossPercent: 5.0,
      maxTotalDrawdownPercent: 10.0,
      profitTargetPercent: 10.0,
    },
    {
      firmName: 'FundingPips',
      accountName: 'FundingPips $50k Evaluation',
      accountSize: 50000,
      maxDailyLossPercent: 4.0,
      maxTotalDrawdownPercent: 8.0,
      profitTargetPercent: 5.0,
    },
  ];

  const createdAccounts = [];
  for (const d of defaults) {
    const res = await query(
      `INSERT INTO accounts
      (user_id, account_name, broker, prop_firm_name, account_type, initial_balance, current_balance, max_daily_drawdown_percent, max_total_drawdown_percent, profit_target, status)
      VALUES ($1, $2, $3, $4, 'challenge', $5, $5, $6, $7, $8, 'active')
      RETURNING *`,
      [userId, d.accountName, d.firmName, d.firmName, d.accountSize, d.maxDailyLossPercent, d.maxTotalDrawdownPercent, d.profitTargetPercent]
    );
    const mapped = await mapAccountToPropFirmData(res.rows[0], userId);
    createdAccounts.push(mapped);
  }
  return createdAccounts;
};

/**
 * @route   GET /api/prop-firm
 * @desc    Fetch user's prop firm accounts from PostgreSQL
 * @access  Private
 */
const getPropFirmAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[PropFirm GET] Fetching prop firm accounts for user: ${userId}`);

    const result = await query(
      `SELECT * FROM accounts WHERE user_id = $1 AND account_type IN ('prop_firm', 'challenge') ORDER BY created_at DESC`,
      [userId]
    );

    let accounts = [];
    if (result.rows.length === 0) {
      console.log(`[PropFirm GET] Seeding initial prop firm accounts for user ${userId}...`);
      accounts = await seedDefaultPropAccounts(userId);
    } else {
      for (const row of result.rows) {
        const mapped = await mapAccountToPropFirmData(row, userId);
        accounts.push(mapped);
      }
    }

    return res.status(200).json({
      status: 'success',
      results: accounts.length,
      data: { accounts },
    });
  } catch (error) {
    console.error('[Get Prop Firm Error]:', error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      message: `Failed to fetch prop firm accounts: ${error.message}`,
    });
  }
};

/**
 * @route   POST /api/prop-firm
 * @desc    Create a new prop firm account configuration in PostgreSQL
 * @access  Private
 */
const createPropFirmAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[PropFirm POST] Request URL: /api/prop-firm');
    console.log('[PropFirm POST] Request payload:', req.body);
    console.log('[PropFirm POST] User ID:', userId);

    const {
      firmName = 'FTMO',
      accountName,
      accountSize = 100000,
      phase = 'challenge',
      maxDailyLossPercent = 5.0,
      maxTotalDrawdownPercent = 10.0,
      profitTargetPercent = 10.0,
      apiCredentials,
    } = req.body;

    // ── Input Validation ──
    if (!accountName || typeof accountName !== 'string' || !accountName.trim()) {
      console.log('[PropFirm POST Validation Error]: Account name missing');
      return res.status(400).json({
        status: 'error',
        message: 'Account label/name is required (e.g., FTMO $100k Challenge).',
      });
    }

    const parsedSize = parseFloat(accountSize);
    if (isNaN(parsedSize) || parsedSize <= 0) {
      console.log('[PropFirm POST Validation Error]: Invalid account size:', accountSize);
      return res.status(400).json({
        status: 'error',
        message: 'Account size must be a valid positive number (e.g. 100000).',
      });
    }

    const parsedDailyLoss = parseFloat(maxDailyLossPercent);
    if (isNaN(parsedDailyLoss) || parsedDailyLoss < 0 || parsedDailyLoss > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Max daily loss percent must be a valid number between 0% and 100%.',
      });
    }

    const parsedTotalDrawdown = parseFloat(maxTotalDrawdownPercent);
    if (isNaN(parsedTotalDrawdown) || parsedTotalDrawdown < 0 || parsedTotalDrawdown > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Max total drawdown percent must be a valid number between 0% and 100%.',
      });
    }

    // ── Direct API Integration Check (Requirement #3 & #6) ──
    if (apiCredentials && (apiCredentials.login || apiCredentials.password)) {
      console.log(`[PropFirm Direct API Check] User attempted direct login to ${firmName}.`);
      return res.status(400).json({
        status: 'error',
        message: `Direct login connection to ${firmName} is unavailable because ${firmName} does not provide an official public API for third-party credentials. Please use the MT5 Auto Sync EA in Settings to sync your MT5 trades automatically.`,
      });
    }

    // ── Insert Account Config into PostgreSQL ──
    const insertResult = await query(
      `INSERT INTO accounts
      (user_id, account_name, broker, prop_firm_name, account_type, initial_balance, current_balance, max_daily_drawdown_percent, max_total_drawdown_percent, profit_target, status)
      VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, 'active')
      RETURNING *`,
      [
        userId,
        accountName.trim(),
        firmName.trim(),
        firmName.trim(),
        phase === 'challenge' ? 'challenge' : 'prop_firm',
        parsedSize,
        parsedDailyLoss,
        parsedTotalDrawdown,
        parseFloat(profitTargetPercent) || 10.0,
      ]
    );

    const createdAccount = await mapAccountToPropFirmData(insertResult.rows[0], userId);
    console.log('[PropFirm POST] Account created successfully:', createdAccount.id);

    return res.status(201).json({
      status: 'success',
      message: 'Prop firm challenge account configured successfully.',
      data: { account: createdAccount },
    });
  } catch (error) {
    console.error('[Create Prop Firm Error]:', error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      message: `Failed to connect prop firm account: ${error.message}`,
    });
  }
};

module.exports = {
  getPropFirmAccounts,
  createPropFirmAccount,
};
