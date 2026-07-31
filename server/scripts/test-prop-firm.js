process.env.NODE_ENV = 'test';
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initDb, query } = require('../config/db');

async function runPropFirmTestSuite() {
  console.log('========================================');
  console.log('🧪 RUNNING PROP FIRM END-TO-END AUDIT SUITE');
  console.log('========================================\n');

  try {
    // 1. Initialize Database
    await initDb();
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../models/schema.sql'), 'utf8');
    await query(schemaSql);
    console.log('✅ PostgreSQL Schema Initialized for Prop Firm Audit');

    // 2. Register Test User
    const email = `propfirm_tester_${Date.now()}@tradetrack.io`;
    const regResult = await query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id`,
      [email, 'hashed_password', 'PropFirm Tester']
    );
    const userId = regResult.rows[0].id;
    console.log(`✅ Test User Created (ID: ${userId})`);

    const { getPropFirmAccounts, createPropFirmAccount } = require('../controllers/propFirmController');

    // ── Test 1: GET /api/prop-firm (Initial Fetch & Auto-Seeding) ──
    console.log('\n--- Test 1: GET /api/prop-firm (Fetch Accounts) ---');
    const reqGet = { user: { id: userId } };
    let initialCount = 0;

    const resGet = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`GET Prop Firm Status: ${this.statusCode}`);
        console.log('Accounts returned:', data.data?.accounts?.length);
        initialCount = data.data?.accounts?.length || 0;
      },
    };

    await getPropFirmAccounts(reqGet, resGet);
    if (initialCount < 2) {
      throw new Error('Test 1 FAILED: Initial prop firm accounts were not seeded correctly.');
    }
    console.log('✅ Test 1 PASSED: Initial prop firm accounts fetched & seeded cleanly in PostgreSQL');

    // ── Test 2: POST /api/prop-firm (Valid Prop Account Creation) ──
    console.log('\n--- Test 2: POST /api/prop-firm (Create Account Configuration) ---');
    const validPayload = {
      firmName: 'Goat Funded Trader',
      accountName: 'Goat Funded $100k Challenge',
      accountSize: 100000,
      phase: 'challenge',
      maxDailyLossPercent: 5.0,
      maxTotalDrawdownPercent: 10.0,
      profitTargetPercent: 10.0,
    };

    const reqPostValid = { user: { id: userId }, body: validPayload };
    let createdAccountId = '';

    const resPostValid = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`POST Prop Firm Status: ${this.statusCode}`);
        console.log('Created Account:', data.data?.account);
        createdAccountId = data.data?.account?.id;
      },
    };

    await createPropFirmAccount(reqPostValid, resPostValid);
    if (!createdAccountId) {
      throw new Error('Test 2 FAILED: Prop firm account was not created.');
    }
    console.log('✅ Test 2 PASSED: New Prop Firm Challenge created and stored in PostgreSQL');

    // ── Test 3: Validation Error Handling (Missing Account Name) ──
    console.log('\n--- Test 3: Validation Error Handling (Missing Account Label) ---');
    const invalidPayload = {
      firmName: 'FTMO',
      accountName: '', // Missing
      accountSize: 100000,
    };

    const reqPostInvalid = { user: { id: userId }, body: invalidPayload };
    let specificErrorMessage = '';

    const resPostInvalid = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Validation Status: ${this.statusCode}`);
        console.log('Error Message returned:', data.message);
        specificErrorMessage = data.message;
      },
    };

    await createPropFirmAccount(reqPostInvalid, resPostInvalid);
    if (!specificErrorMessage || specificErrorMessage.includes('Failed to connect')) {
      throw new Error('Test 3 FAILED: Specific validation error message was not returned.');
    }
    console.log('✅ Test 3 PASSED: Specific input validation error returned correctly');

    // ── Test 4: Direct Login Credentials Check (Requirement #3 & #6) ──
    console.log('\n--- Test 4: Direct Login Credentials Check ---');
    const directLoginPayload = {
      firmName: 'FTMO',
      accountName: 'FTMO Account',
      apiCredentials: {
        login: '123456',
        password: 'Password123',
      },
    };

    const reqDirect = { user: { id: userId }, body: directLoginPayload };
    let directApiNotice = '';

    const resDirect = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Direct API Check Status: ${this.statusCode}`);
        console.log('Direct API Notice:', data.message);
        directApiNotice = data.message;
      },
    };

    await createPropFirmAccount(reqDirect, resDirect);
    if (!directApiNotice || !directApiNotice.includes('does not provide an official public API')) {
      throw new Error('Test 4 FAILED: Direct API limitation notice was not returned.');
    }
    console.log('✅ Test 4 PASSED: Direct login attempt returned clear explanation guiding user to MT5 Auto Sync');

    console.log('\n========================================');
    console.log('🎉 ALL PROP FIRM AUDIT TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ PROP FIRM AUDIT SUITE FAILED:', err.message, err.stack);
    process.exit(1);
  }
}

runPropFirmTestSuite();
