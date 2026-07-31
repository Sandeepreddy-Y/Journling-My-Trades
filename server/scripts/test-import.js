process.env.NODE_ENV = 'test';

const http = require('http');
const path = require('path');
const fs = require('fs');

const app = require('../server');
const { query, initDb } = require('../config/db');

let server;
const PORT = 5098;

// Create dummy multipart form-data payload for HTTP upload
function makeMultipartData(filename, fileBuffer, boundary) {
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([Buffer.from(header), fileBuffer, Buffer.from(footer)]);
}

function uploadFile(urlPath, filename, fileBuffer, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const body = makeMultipartData(filename, fileBuffer, boundary);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
      Authorization: `Bearer ${token}`,
    };

    const req = http.request(
      `http://localhost:${PORT}${urlPath}`,
      { method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJson(urlPath, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:${PORT}${urlPath}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runImportTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING TRADE IMPORT END-TO-END TEST SUITE');
  console.log('========================================\n');

  await initDb();
  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../models/schema.sql'), 'utf8');
  await query(schemaSql);

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`[Test Server] Running on http://localhost:${PORT}`);

  // Create test user
  const user1Email = `importer_${Date.now()}@test.com`;
  const regRes = await query(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email`,
    [user1Email, 'hash123', 'Import Tester']
  );
  const user1Id = regRes.rows[0].id;

  const jwt = require('../utils/jwt');
  const token = jwt.generateAccessToken({ id: user1Id, email: user1Email, role: 'trader' });

  try {
    // ── 1. TEST MT4/MT5 HTML STATEMENT IMPORT ──
    console.log('--- Test 1: MT4/MT5 Detailed HTML Statement Import ---');
    const sampleHtml = `
      <html>
        <body>
          <h2>Closed Transactions</h2>
          <table>
            <tr><td>Ticket</td><td>Open Time</td><td>Type</td><td>Size</td><td>Item</td><td>Price</td><td>S / L</td><td>T / P</td><td>Close Time</td><td>Price</td><td>Commission</td><td>Taxes</td><td>Swap</td><td>Profit</td></tr>
            <tr><td>100101</td><td>2026.07.25 10:00:00</td><td>buy</td><td>1.50</td><td>XAUUSD</td><td>2380.00</td><td>2370.00</td><td>2400.00</td><td>2026.07.25 14:30:00</td><td>2395.00</td><td>-10.00</td><td>0.00</td><td>0.00</td><td>2250.00</td></tr>
            <tr><td>100102</td><td>2026.07.26 09:00:00</td><td>sell</td><td>2.00</td><td>EURUSD</td><td>1.0890</td><td>1.0920</td><td>1.0820</td><td>2026.07.26 12:15:00</td><td>1.0840</td><td>-15.00</td><td>0.00</td><td>0.00</td><td>1000.00</td></tr>
            <tr><td>100103</td><td>2026.07.27 15:00:00</td><td>buy</td><td>1.00</td><td>US30</td><td>39800.00</td><td>39650.00</td><td>40100.00</td><td>2026.07.27 16:30:00</td><td>39650.00</td><td>-5.00</td><td>0.00</td><td>0.00</td><td>-1500.00</td></tr>
          </table>
        </body>
      </html>
    `;

    const htmlBuffer = Buffer.from(sampleHtml);
    const resHtml = await uploadFile('/api/trades/import', 'Statement.html', htmlBuffer, token);
    console.log('HTML Import Status:', resHtml.status);
    console.log('Import Result:', resHtml.data?.data);

    if (resHtml.status === 200 && resHtml.data?.data?.importedCount === 3) {
      console.log('✅ Test 1 PASSED: MT4/MT5 HTML Statement successfully parsed & 3 trades inserted');
    } else {
      throw new Error(`Test 1 FAILED: Expected 3 imported trades, got ${resHtml.data?.data?.importedCount}`);
    }

    // ── 2. TEST CSV STATEMENT IMPORT ──
    console.log('\n--- Test 2: CSV Statement Import ---');
    const sampleCsv = `Ticket,Open Time,Type,Size,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit
200201,2026-07-28 08:00:00,buy,3.00,GBPUSD,1.2850,1.2800,1.2920,2026-07-28 11:30:00,1.2910,0.00,0.00,1800.00
200202,2026-07-29 14:00:00,sell,1.00,BTCUSD,65000.00,66000.00,63000.00,2026-07-29 18:00:00,64000.00,0.00,0.00,1000.00`;

    const csvBuffer = Buffer.from(sampleCsv);
    const resCsv = await uploadFile('/api/trades/import', 'Trades.csv', csvBuffer, token);
    console.log('CSV Import Status:', resCsv.status);
    console.log('Import Result:', resCsv.data?.data);

    if (resCsv.status === 200 && resCsv.data?.data?.importedCount === 2) {
      console.log('✅ Test 2 PASSED: CSV Statement parsed & 2 trades inserted');
    } else {
      throw new Error(`Test 2 FAILED: Expected 2 imported trades, got ${resCsv.data?.data?.importedCount}`);
    }

    // ── 3. TEST DUPLICATE DETECTION ──
    console.log('\n--- Test 3: Duplicate Import Detection ---');
    const resDup = await uploadFile('/api/trades/import', 'Trades.csv', csvBuffer, token);
    console.log('Duplicate Import Status:', resDup.status);
    console.log('Duplicate Result:', resDup.data?.data);

    if (resDup.status === 200 && resDup.data?.data?.importedCount === 0 && resDup.data?.data?.duplicateCount === 2) {
      console.log('✅ Test 3 PASSED: Duplicate detection correctly skipped existing trades');
    } else {
      throw new Error(`Test 3 FAILED: Duplicate trades were re-inserted`);
    }

    // ── 4. TEST FETCH TRADES & CAMELCASE FIELD MAPPING ──
    console.log('\n--- Test 4: GET /api/trades (CamelCase Field Mapping Verification) ---');
    const resGetTrades = await getJson('/api/trades', token);
    console.log('Get Trades Status:', resGetTrades.status);
    console.log('Total Trades Fetched:', resGetTrades.data?.data?.trades?.length);
    const firstTrade = resGetTrades.data?.data?.trades?.[0];
    console.log('Sample Trade Mapping:', {
      id: firstTrade?.id,
      symbol: firstTrade?.symbol,
      assetClass: firstTrade?.assetClass,
      entryPrice: firstTrade?.entryPrice,
      exitPrice: firstTrade?.exitPrice,
      entryTime: firstTrade?.entryTime,
      pnl: firstTrade?.pnl,
    });

    if (
      resGetTrades.status === 200 &&
      resGetTrades.data?.data?.trades?.length === 5 &&
      firstTrade?.entryPrice > 0 &&
      firstTrade?.entryTime
    ) {
      console.log('✅ Test 4 PASSED: Trades returned with proper camelCase fields & valid values');
    } else {
      throw new Error('Test 4 FAILED: Trades list returned broken or unmapped fields');
    }

    // ── 5. TEST GET /api/analytics ──
    console.log('\n--- Test 5: GET /api/analytics (PostgreSQL Analytics Metrics Computation) ---');
    const resAnalytics = await getJson('/api/analytics', token);
    console.log('Analytics Status:', resAnalytics.status);
    console.log('Overview Metrics:', resAnalytics.data?.data?.overview);

    if (
      resAnalytics.status === 200 &&
      resAnalytics.data?.data?.overview?.totalTrades === 5 &&
      resAnalytics.data?.data?.overview?.winRate > 0 &&
      resAnalytics.data?.data?.equityCurve?.length > 0
    ) {
      console.log('✅ Test 5 PASSED: Analytics metrics, equity curve & win rate computed from PostgreSQL');
    } else {
      throw new Error('Test 5 FAILED: Analytics metrics calculation failed');
    }

    // ── 6. TEST USER ISOLATION ──
    console.log('\n--- Test 6: Strict User Isolation Verification ---');
    const user2Email = `importer_user2_${Date.now()}@test.com`;
    const regRes2 = await query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id`,
      [user2Email, 'hash123', 'User Two']
    );
    const tokenUser2 = jwt.generateAccessToken({ id: regRes2.rows[0].id, email: user2Email, role: 'trader' });
    const resUser2Trades = await getJson('/api/trades', tokenUser2);

    if (resUser2Trades.status === 200 && resUser2Trades.data?.data?.trades?.length === 0) {
      console.log('✅ Test 6 PASSED: User 2 sees 0 trades (User isolation 100% maintained)');
    } else {
      throw new Error('Test 6 FAILED: User isolation leak detected!');
    }

    console.log('\n========================================');
    console.log('🎉 ALL 6 TRADE IMPORT TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ IMPORT TEST SUITE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runImportTests();
