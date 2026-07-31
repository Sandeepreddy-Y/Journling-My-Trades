process.env.NODE_ENV = 'test';
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initDb, query } = require('../config/db');

async function runAutoSyncTestSuite() {
  console.log('========================================');
  console.log('🧪 RUNNING MT5 REAL-TIME AUTO SYNC TEST SUITE');
  console.log('========================================\n');

  try {
    // 1. Initialize Database
    await initDb();
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../models/schema.sql'), 'utf8');
    await query(schemaSql);
    console.log('✅ PostgreSQL Schema Initialized for Sync Tests');

    // 2. Register Test User & Login
    const email = `sync_tester_${Date.now()}@tradetrack.io`;
    const password = 'Password123!';

    const regResult = await query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id`,
      [email, 'hashed_password', 'AutoSync Tester']
    );
    const userId = regResult.rows[0].id;

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
    console.log(`✅ Test User Created (ID: ${userId})`);

    // ── Test 1: Register Auto Sync API Key ──
    console.log('\n--- Test 1: POST /api/sync/register (Generate API Key) ---');
    const { registerSyncKey } = require('../controllers/syncController');

    const reqReg = { user: { id: userId }, body: {} };
    let apiKey = '';

    const resReg = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Register API Key Status: ${this.statusCode}`);
        console.log('API Key Data:', data.data);
        apiKey = data.data.apiKey;
      },
    };

    await registerSyncKey(reqReg, resReg);
    if (!apiKey || !apiKey.startsWith('ttp_live_')) {
      throw new Error('Test 1 FAILED: Valid API Key was not generated.');
    }
    console.log('✅ Test 1 PASSED: Auto Sync API Key generated successfully');

    // ── Test 2: Receive EA Heartbeat ──
    console.log('\n--- Test 2: POST /api/sync/heartbeat (EA Heartbeat Ping) ---');
    const { receiveHeartbeat } = require('../controllers/syncController');

    const reqHeartbeat = {
      headers: { 'x-api-key': apiKey },
      body: {
        accountNumber: '8849201',
        broker: 'GoatFunded Trader',
        server: 'GoatFunded-Live',
        currency: 'USD',
        terminalId: 'MT5_8849201',
        eaVersion: '1.0.0',
      },
    };

    let heartbeatSuccess = false;
    const resHeartbeat = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Heartbeat Response Status: ${this.statusCode}`);
        console.log('Heartbeat Data:', data);
        if (data.status === 'success') heartbeatSuccess = true;
      },
    };

    await receiveHeartbeat(reqHeartbeat, resHeartbeat);
    if (!heartbeatSuccess) {
      throw new Error('Test 2 FAILED: EA Heartbeat was not acknowledged.');
    }
    console.log('✅ Test 2 PASSED: EA Heartbeat ping processed and recorded');

    // ── Test 3: Sync Closed Trade from MT5 EA ──
    console.log('\n--- Test 3: POST /api/sync/trade (EA Closed Trade Sync) ---');
    const { syncTrade } = require('../controllers/syncController');

    const sampleTradePayload = {
      ticket: '990101',
      positionId: '990101',
      symbol: 'XAUUSD',
      direction: 'buy',
      volume: 2.0,
      entryPrice: 2385.5,
      exitPrice: 2402.0,
      stopLoss: 2375.0,
      takeProfit: 2410.0,
      commission: -12.5,
      swap: -2.0,
      profit: 3300.0,
      entryTime: '2026-07-30T10:00:00.000Z',
      exitTime: '2026-07-30T14:30:00.000Z',
      accountNumber: '8849201',
      broker: 'GoatFunded Trader',
      server: 'GoatFunded-Live',
      currency: 'USD',
    };

    const reqTrade = {
      headers: { 'x-api-key': apiKey },
      body: sampleTradePayload,
      app: { get: () => null }, // Mock Socket.IO app context
    };

    let tradeSynced = false;
    const resTrade = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Sync Trade Status: ${this.statusCode}`);
        console.log('Synced Trade Data:', data.data?.trade);
        if (data.status === 'success' && data.data?.trade) tradeSynced = true;
      },
    };

    await syncTrade(reqTrade, resTrade);
    if (!tradeSynced) {
      throw new Error('Test 3 FAILED: Closed MT5 trade was not synced.');
    }
    console.log('✅ Test 3 PASSED: MT5 Trade synced into PostgreSQL DB');

    // ── Test 4: Duplicate Trade Protection ──
    console.log('\n--- Test 4: POST /api/sync/trade (Duplicate Prevention) ---');
    let isDuplicateIgnored = false;

    const resTradeDup = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Duplicate Sync Status: ${this.statusCode}`);
        console.log('Duplicate Result:', data);
        if (data.duplicate === true) isDuplicateIgnored = true;
      },
    };

    await syncTrade(reqTrade, resTradeDup);
    if (!isDuplicateIgnored) {
      throw new Error('Test 4 FAILED: Duplicate trade ticket was re-inserted.');
    }
    console.log('✅ Test 4 PASSED: Duplicate trade ticket correctly ignored');

    // ── Test 5: Verify Sync Status Endpoint ──
    console.log('\n--- Test 5: GET /api/sync/status (Fetch Connection Status) ---');
    const { getSyncStatus } = require('../controllers/syncController');

    const reqStatus = { user: { id: userId } };
    let statusVerified = false;

    const resStatus = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Sync Status Response: ${this.statusCode}`);
        console.log('Sync Status Data:', data.data);
        if (data.data.isConnected && data.data.tradesSyncedToday === 1) {
          statusVerified = true;
        }
      },
    };

    await getSyncStatus(reqStatus, resStatus);
    if (!statusVerified) {
      throw new Error('Test 5 FAILED: Sync status metrics do not match.');
    }
    console.log('✅ Test 5 PASSED: Sync Status verified (Connected & 1 trade synced today)');

    console.log('\n========================================');
    console.log('🎉 ALL 5 MT5 AUTO SYNC TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ AUTO SYNC TEST SUITE FAILED:', err.message, err.stack);
    process.exit(1);
  }
}

runAutoSyncTestSuite();
