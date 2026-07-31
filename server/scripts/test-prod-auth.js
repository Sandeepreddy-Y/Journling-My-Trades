process.env.NODE_ENV = 'test';
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initDb, query } = require('../config/db');

async function runProductionAuthAuditSuite() {
  console.log('========================================');
  console.log('🧪 RUNNING PRODUCTION AUTHENTICATION AUDIT SUITE');
  console.log('========================================\n');

  try {
    // 1. Initialize Database
    await initDb();
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../models/schema.sql'), 'utf8');
    await query(schemaSql);
    console.log('✅ PostgreSQL Schema Initialized for Production Auth Audit');

    const { register, login, getMe } = require('../controllers/authController');

    const testEmail = `audit_trader_${Date.now()}@tradetrack.io`;
    const testPassword = 'SecurePassword123!';
    const testName = 'Production Audit Trader';

    // ── Test 1: User Registration ──
    console.log('\n--- Test 1: POST /api/auth/register (User Registration) ---');
    const reqRegister = {
      body: {
        fullName: testName,
        email: testEmail,
        password: testPassword,
      },
    };

    let registeredUser = null;
    let registerToken = '';

    const resRegister = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      cookie() {},
      json(data) {
        console.log(`Registration Response Status: ${this.statusCode}`);
        console.log('Registration Response Body:', data);
        registeredUser = data.data?.user;
        registerToken = data.data?.token;
      },
    };

    await register(reqRegister, resRegister);
    if (!registeredUser || !registerToken) {
      throw new Error('Test 1 FAILED: Registration failed to issue user or token.');
    }
    console.log('✅ Test 1 PASSED: User registered cleanly & JWT token generated');

    // ── Test 2: Duplicate Registration Check ──
    console.log('\n--- Test 2: POST /api/auth/register (Duplicate Email Prevention) ---');
    let duplicateMessage = '';

    const resDup = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      cookie() {},
      json(data) {
        console.log(`Duplicate Registration Response Status: ${this.statusCode}`);
        console.log('Duplicate Response Message:', data.message);
        duplicateMessage = data.message;
      },
    };

    await register(reqRegister, resDup);
    if (!duplicateMessage || !duplicateMessage.includes('already exists')) {
      throw new Error('Test 2 FAILED: Duplicate registration message missing.');
    }
    console.log('✅ Test 2 PASSED: Duplicate registration correctly blocked with precise message');

    // ── Test 3: Login with Non-Existent Email ──
    console.log('\n--- Test 3: POST /api/auth/login (Non-Existent Email) ---');
    const reqNonExistent = {
      body: {
        email: `nonexistent_${Date.now()}@tradetrack.io`,
        password: testPassword,
      },
    };

    let nonExistentMessage = '';

    const resNonExistent = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      cookie() {},
      json(data) {
        console.log(`Non-Existent User Response Status: ${this.statusCode}`);
        console.log('Response Message:', data.message);
        nonExistentMessage = data.message;
      },
    };

    await login(reqNonExistent, resNonExistent);
    if (!nonExistentMessage || !nonExistentMessage.includes('User account not found')) {
      throw new Error('Test 3 FAILED: Precise non-existent email message missing.');
    }
    console.log('✅ Test 3 PASSED: Non-existent user returned precise error message');

    // ── Test 4: Login with Wrong Password ──
    console.log('\n--- Test 4: POST /api/auth/login (Wrong Password) ---');
    const reqWrongPassword = {
      body: {
        email: testEmail,
        password: 'WrongPassword999!',
      },
    };

    let wrongPasswordMessage = '';

    const resWrongPassword = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      cookie() {},
      json(data) {
        console.log(`Wrong Password Response Status: ${this.statusCode}`);
        console.log('Response Message:', data.message);
        wrongPasswordMessage = data.message;
      },
    };

    await login(reqWrongPassword, resWrongPassword);
    if (!wrongPasswordMessage || !wrongPasswordMessage.includes('Invalid password')) {
      throw new Error('Test 4 FAILED: Precise wrong password error message missing.');
    }
    console.log('✅ Test 4 PASSED: Wrong password returned precise error message');

    // ── Test 5: Successful Login ──
    console.log('\n--- Test 5: POST /api/auth/login (Successful Login) ---');
    const reqValidLogin = {
      body: {
        email: testEmail,
        password: testPassword,
      },
    };

    let loggedInUser = null;
    let loginToken = '';

    const resValidLogin = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      cookie() {},
      json(data) {
        console.log(`Login Response Status: ${this.statusCode}`);
        console.log('Login Response Body:', data);
        loggedInUser = data.data?.user;
        loginToken = data.data?.token;
      },
    };

    await login(reqValidLogin, resValidLogin);
    if (!loggedInUser || !loginToken) {
      throw new Error('Test 5 FAILED: Login failed to issue user or token.');
    }
    console.log('✅ Test 5 PASSED: Valid credentials authenticated cleanly & JWT issued');

    // ── Test 6: Fetch Profile with JWT ──
    console.log('\n--- Test 6: GET /api/auth/me (Authenticated User Profile) ---');
    const reqMe = { user: { id: loggedInUser.id } };
    let profileFetched = false;

    const resMe = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log(`Me Response Status: ${this.statusCode}`);
        console.log('Profile Data:', data.data?.user);
        if (data.data?.user?.email === testEmail.toLowerCase()) {
          profileFetched = true;
        }
      },
    };

    await getMe(reqMe, resMe);
    if (!profileFetched) {
      throw new Error('Test 6 FAILED: Failed to fetch authenticated user profile.');
    }
    console.log('✅ Test 6 PASSED: User profile retrieved via JWT authentication');

    console.log('\n========================================');
    console.log('🎉 ALL 6 PRODUCTION AUTH AUDIT TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ AUTH AUDIT SUITE FAILED:', err.message, err.stack);
    process.exit(1);
  }
}

runProductionAuthAuditSuite();
