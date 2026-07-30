const { query, memoryDb, pool } = require('../config/db');

// Sample default prop firm accounts (FTMO, FundingPips, Goat Funded, Funding Traders)
const DEFAULT_PROP_ACCOUNTS = [
  {
    id: 'pf-101',
    userId: 'user-1',
    firmName: 'FTMO',
    accountName: 'FTMO $100k Challenge (Phase 1)',
    accountSize: 100000,
    currentBalance: 106450,
    startingBalance: 100000,
    phase: 'challenge', // 'challenge' | 'verification' | 'funded'
    status: 'active', // 'active' | 'passed' | 'failed' | 'withdrawn'
    maxDailyLossPercent: 5.0, // 5% = $5,000
    currentDailyLoss: 420.00, // Today's drawdown
    maxTotalDrawdownPercent: 10.0, // 10% = $10,000
    currentTotalDrawdown: 850.00, // Peak to trough
    profitTargetPercent: 10.0, // 10% = $10,000
    currentProfit: 6450.00, // Current PnL
    minTradingDays: 4,
    tradingDaysCompleted: 8,
    bestDayProfit: 2150.00, // For consistency rule (max 40% single day rule)
    payoutCountdownDays: 14,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pf-102',
    userId: 'user-1',
    firmName: 'FundingPips',
    accountName: 'FundingPips $50k Evaluation (Phase 2)',
    accountSize: 50000,
    currentBalance: 52800,
    startingBalance: 50000,
    phase: 'verification',
    status: 'active',
    maxDailyLossPercent: 4.0, // 4% = $2,000
    currentDailyLoss: 150.00,
    maxTotalDrawdownPercent: 8.0, // 8% = $4,000
    currentTotalDrawdown: 350.00,
    profitTargetPercent: 5.0, // 5% = $2,500
    currentProfit: 2800.00,
    minTradingDays: 5,
    tradingDaysCompleted: 5,
    bestDayProfit: 850.00,
    payoutCountdownDays: 7,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pf-103',
    userId: 'user-1',
    firmName: 'Goat Funded',
    accountName: 'Goat Funded $100k Live Account',
    accountSize: 100000,
    currentBalance: 108250,
    startingBalance: 100000,
    phase: 'funded',
    status: 'active',
    maxDailyLossPercent: 5.0,
    currentDailyLoss: 0.00,
    maxTotalDrawdownPercent: 10.0,
    currentTotalDrawdown: 600.00,
    profitTargetPercent: 0.0, // Funded account (no target)
    currentProfit: 8250.00,
    minTradingDays: 0,
    tradingDaysCompleted: 18,
    bestDayProfit: 2400.00,
    payoutCountdownDays: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pf-104',
    userId: 'user-1',
    firmName: 'Funding Traders',
    accountName: 'Funding Traders $200k Executive Challenge',
    accountSize: 200000,
    currentBalance: 211400,
    startingBalance: 200000,
    phase: 'challenge',
    status: 'active',
    maxDailyLossPercent: 5.0,
    currentDailyLoss: 620.00,
    maxTotalDrawdownPercent: 10.0,
    currentTotalDrawdown: 1100.00,
    profitTargetPercent: 8.0, // 8% = $16,000
    currentProfit: 11400.00,
    minTradingDays: 5,
    tradingDaysCompleted: 9,
    bestDayProfit: 3800.00,
    payoutCountdownDays: 18,
    createdAt: new Date().toISOString(),
  },
];

/**
 * @route   GET /api/prop-firm
 * @desc    Get all prop firm accounts for user
 * @access  Private
 */
const getPropFirmAccounts = async (req, res) => {
  try {
    let accounts = DEFAULT_PROP_ACCOUNTS;

    if (!memoryDb.propFirmAccounts) {
      memoryDb.propFirmAccounts = DEFAULT_PROP_ACCOUNTS;
    } else {
      accounts = memoryDb.propFirmAccounts;
    }

    return res.status(200).json({
      status: 'success',
      results: accounts.length,
      data: { accounts },
    });
  } catch (error) {
    console.error('[Get Prop Firm Error]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prop firm accounts.',
    });
  }
};

/**
 * @route   POST /api/prop-firm
 * @desc    Add a new prop firm account
 * @access  Private
 */
const createPropFirmAccount = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'user-1';
    const {
      firmName = 'FTMO',
      accountName,
      accountSize = 100000,
      phase = 'challenge',
      maxDailyLossPercent = 5.0,
      maxTotalDrawdownPercent = 10.0,
      profitTargetPercent = 10.0,
      minTradingDays = 5,
    } = req.body;

    if (!accountName) {
      return res.status(400).json({
        status: 'error',
        message: 'Account name is required.',
      });
    }

    const newAccount = {
      id: `pf-${Date.now()}`,
      userId,
      firmName,
      accountName,
      accountSize: parseFloat(accountSize),
      currentBalance: parseFloat(accountSize),
      startingBalance: parseFloat(accountSize),
      phase,
      status: 'active',
      maxDailyLossPercent: parseFloat(maxDailyLossPercent),
      currentDailyLoss: 0,
      maxTotalDrawdownPercent: parseFloat(maxTotalDrawdownPercent),
      currentTotalDrawdown: 0,
      profitTargetPercent: parseFloat(profitTargetPercent),
      currentProfit: 0,
      minTradingDays: parseInt(minTradingDays) || 5,
      tradingDaysCompleted: 0,
      bestDayProfit: 0,
      payoutCountdownDays: 14,
      createdAt: new Date().toISOString(),
    };

    if (!memoryDb.propFirmAccounts) {
      memoryDb.propFirmAccounts = [...DEFAULT_PROP_ACCOUNTS];
    }
    memoryDb.propFirmAccounts.unshift(newAccount);

    return res.status(201).json({
      status: 'success',
      message: 'Prop firm account added successfully.',
      data: { account: newAccount },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error creating prop firm account.',
    });
  }
};

module.exports = {
  getPropFirmAccounts,
  createPropFirmAccount,
};
