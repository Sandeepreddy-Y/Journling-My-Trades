const http = require('http');
const path = require('path');
const fs = require('fs');

// Ensure server is imported and db initialized
const app = require('../server');
const { query, initDb } = require('../config/db');

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api/auth`;

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      ...headers,
    };

    const req = http.request(
      `http://localhost:${PORT}${urlPath}`,
      { method, headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, data: json, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING AUTHENTICATION END-TO-END AUDIT & TEST SUITE');
  console.log('========================================\n');

  // Initialize DB tables
  await initDb();
  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../models/schema.sql'), 'utf8');
  await query(schemaSql);

  // Start HTTP server on test port
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`[Test Server] Running on http://localhost:${PORT}`);

  const testEmail = `trader_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Alex Trader';

  let accessToken = '';
  let refreshToken = '';
  let userId = '';

  try {
    // ── 1. TEST INVALID PASSWORD ──
    console.log('\n--- Test 1: Short Password Registration ---');
    const resShortPass = await request('POST', '/api/auth/register', {
      fullName: testName,
      email: testEmail,
      password: 'short',
    });
    console.log('Response Status:', resShortPass.status);
    console.log('Message:', resShortPass.data.message);
    if (resShortPass.status === 400) {
      console.log('✅ Test 1 PASSED: Invalid password rejected');
    } else {
      throw new Error(`Test 1 FAILED: Expected 400, got ${resShortPass.status}`);
    }

    // ── 2. TEST REGISTER NEW USER ──
    console.log('\n--- Test 2: Register New User ---');
    const resRegister = await request('POST', '/api/auth/register', {
      fullName: testName,
      email: testEmail,
      password: testPassword,
    });
    console.log('Response Status:', resRegister.status);
    console.log('Registered User:', resRegister.data.data?.user);
    if (resRegister.status === 201 && resRegister.data.data?.token) {
      accessToken = resRegister.data.data.token;
      refreshToken = resRegister.data.data.refreshToken;
      userId = resRegister.data.data.user.id;
      console.log('✅ Test 2 PASSED: User registered, JWT & refresh token received');
    } else {
      throw new Error(`Test 2 FAILED: Registration unsuccessful`);
    }

    // ── 3. VERIFY STORED IN POSTGRESQL ──
    console.log('\n--- Test 3: Verify User Stored in PostgreSQL ---');
    const dbCheck = await query('SELECT id, email, display_name, role FROM users WHERE id = $1', [userId]);
    if (dbCheck.rows.length === 1 && dbCheck.rows[0].email === testEmail.toLowerCase()) {
      console.log('PostgreSQL User Record:', dbCheck.rows[0]);
      console.log('✅ Test 3 PASSED: User verified in PostgreSQL database');
    } else {
      throw new Error('Test 3 FAILED: User not found in PostgreSQL database');
    }

    // ── 4. TEST DUPLICATE EMAIL ──
    console.log('\n--- Test 4: Duplicate Email Registration ---');
    const resDup = await request('POST', '/api/auth/register', {
      fullName: testName,
      email: testEmail,
      password: testPassword,
    });
    console.log('Response Status:', resDup.status);
    console.log('Message:', resDup.data.message);
    if (resDup.status === 400) {
      console.log('✅ Test 4 PASSED: Duplicate email correctly blocked');
    } else {
      throw new Error(`Test 4 FAILED: Expected 400, got ${resDup.status}`);
    }

    // ── 5. TEST WRONG PASSWORD LOGIN ──
    console.log('\n--- Test 5: Login With Wrong Password ---');
    const resWrongPass = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword123!',
    });
    console.log('Response Status:', resWrongPass.status);
    console.log('Message:', resWrongPass.data.message);
    if (resWrongPass.status === 401) {
      console.log('✅ Test 5 PASSED: Wrong password rejected');
    } else {
      throw new Error(`Test 5 FAILED: Expected 401, got ${resWrongPass.status}`);
    }

    // ── 6. TEST LOGIN SUCCESS ──
    console.log('\n--- Test 6: Login Success ---');
    const resLogin = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    console.log('Response Status:', resLogin.status);
    console.log('Login User Data:', resLogin.data.data?.user);
    if (resLogin.status === 200 && resLogin.data.data?.token) {
      accessToken = resLogin.data.data.token;
      refreshToken = resLogin.data.data.refreshToken;
      console.log('✅ Test 6 PASSED: Login successful & JWT issued');
    } else {
      throw new Error(`Test 6 FAILED: Login failed`);
    }

    // ── 7. TEST /api/auth/me ──
    console.log('\n--- Test 7: GET /api/auth/me (Authenticated Profile) ---');
    const resMe = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    console.log('Response Status:', resMe.status);
    console.log('Me User Profile:', resMe.data.data?.user);
    if (resMe.status === 200 && resMe.data.data?.user?.email === testEmail.toLowerCase()) {
      console.log('✅ Test 7 PASSED: Current user fetched correctly via JWT');
    } else {
      throw new Error(`Test 7 FAILED: GET /api/auth/me failed`);
    }

    // ── 8. TEST REFRESH TOKEN ──
    console.log('\n--- Test 8: POST /api/auth/refresh ---');
    const resRefresh = await request('POST', '/api/auth/refresh', {
      refreshToken,
    });
    console.log('Response Status:', resRefresh.status);
    console.log('New Token Received:', !!resRefresh.data.data?.token);
    if (resRefresh.status === 200 && resRefresh.data.data?.token) {
      accessToken = resRefresh.data.data.token;
      console.log('✅ Test 8 PASSED: Access token successfully refreshed');
    } else {
      throw new Error(`Test 8 FAILED: Token refresh failed`);
    }

    // ── 9. TEST LOGOUT ──
    console.log('\n--- Test 9: POST /api/auth/logout ---');
    const resLogout = await request('POST', '/api/auth/logout', {
      refreshToken,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });
    console.log('Response Status:', resLogout.status);
    console.log('Message:', resLogout.data.message);
    if (resLogout.status === 200) {
      console.log('✅ Test 9 PASSED: Logout succeeded');
    } else {
      throw new Error(`Test 9 FAILED: Logout failed`);
    }

    console.log('\n========================================');
    console.log('🎉 ALL 9 AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runTests();
