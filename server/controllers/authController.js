const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

// Helper to set HTTP-Only Cookie for Refresh Token
const setRefreshTokenCookie = (res, refreshToken, rememberMe = false) => {
  const maxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000 // 30 Days
    : 7 * 24 * 60 * 60 * 1000;  // 7 Days

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge,
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new trader account
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    console.log('[Auth:Register] Incoming registration request for:', email);

    // ── Input Validation ──
    if (!fullName || !fullName.trim()) {
      console.log('[Auth:Register] ❌ Validation Error: Missing fullName');
      return res.status(400).json({
        status: 'error',
        message: 'Full Name is required.',
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      console.log('[Auth:Register] ❌ Validation Error: Invalid email format');
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    if (!password || password.length < 8) {
      console.log('[Auth:Register] ❌ Validation Error: Password must be at least 8 characters');
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Check Database Connection & Duplicate Email ──
    console.log('[Auth:Register] Querying database for duplicate email...');
    let existingUserResult;
    try {
      existingUserResult = await query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );
    } catch (sqlErr) {
      console.error('[Auth:Register Database Error] User lookup failed:', sqlErr.message, sqlErr.stack);
      return res.status(500).json({
        status: 'error',
        message: `Database connection error during duplicate check: ${sqlErr.message}`,
      });
    }

    if (existingUserResult.rows.length > 0) {
      console.log('[Auth:Register] ❌ Duplicate email found:', normalizedEmail);
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    // ── Bcrypt Password Hashing ──
    let passwordHash;
    try {
      const salt = await bcrypt.genSalt(12);
      passwordHash = await bcrypt.hash(password, salt);
      console.log('[Auth:Register] Password hashed successfully');
    } catch (bcryptErr) {
      console.error('[Auth:Register Bcrypt Error]:', bcryptErr.message, bcryptErr.stack);
      return res.status(500).json({
        status: 'error',
        message: 'Password encryption failed.',
      });
    }

    // ── Insert User into PostgreSQL ──
    let insertResult;
    try {
      insertResult = await query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, avatar_url, role, theme_preference, created_at`,
        [normalizedEmail, passwordHash, fullName.trim()]
      );
    } catch (sqlErr) {
      console.error('[Auth:Register SQL Error] User insertion failed:', sqlErr.message, sqlErr.stack);
      return res.status(500).json({
        status: 'error',
        message: `Database error inserting new user: ${sqlErr.message}`,
      });
    }

    const newUser = insertResult.rows[0];
    console.log('[Auth:Register] User insert successful:', newUser.id);

    // ── JWT Token Generation ──
    let accessToken, refreshToken;
    try {
      accessToken = generateAccessToken(newUser);
      refreshToken = generateRefreshToken(newUser);
      console.log('[Auth:Register] JWT tokens generated successfully');
    } catch (jwtErr) {
      console.error('[Auth:Register JWT Error]:', jwtErr.message, jwtErr.stack);
      return res.status(500).json({
        status: 'error',
        message: 'JWT token generation failed.',
      });
    }

    // ── Session Storage in PostgreSQL ──
    try {
      await query(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [newUser.id, refreshToken]
      );
      console.log('[Auth:Register] Session record created');
    } catch (sessionErr) {
      console.error('[Auth:Register SQL Error] Session creation warning:', sessionErr.message);
    }

    setRefreshTokenCookie(res, refreshToken, false);

    console.log('[Auth:Register] 201 Created - Registration completed for:', newUser.email);
    return res.status(201).json({
      status: 'success',
      message: 'Account registered successfully.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.display_name,
          avatarUrl: newUser.avatar_url || null,
          role: newUser.role,
          themePreference: newUser.theme_preference || 'dark',
          createdAt: newUser.created_at,
        },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth:Register Fatal Error]:', error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      message: `Server error during registration: ${error.message}`,
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials & issue JWT tokens
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    console.log('[Auth:Login] Processing login attempt for:', email);

    if (!email || !password) {
      console.log('[Auth:Login] ❌ Validation Error: Missing credentials');
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Query User from PostgreSQL ──
    let userResult;
    try {
      userResult = await query(
        'SELECT id, email, password_hash, display_name, avatar_url, role, theme_preference, created_at FROM users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );
    } catch (sqlErr) {
      console.error('[Auth:Login SQL Error] User lookup failed:', sqlErr.message, sqlErr.stack);
      return res.status(500).json({
        status: 'error',
        message: `Database connection error during login: ${sqlErr.message}`,
      });
    }

    if (userResult.rows.length === 0) {
      console.log('[Auth:Login] ❌ User lookup: User not found for email:', normalizedEmail);
      return res.status(401).json({
        status: 'error',
        message: 'User account not found with this email address.',
      });
    }

    const user = userResult.rows[0];
    console.log('[Auth:Login] User found:', user.id);

    // ── Bcrypt Password Verification ──
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptErr) {
      console.error('[Auth:Login Bcrypt Error]:', bcryptErr.message, bcryptErr.stack);
      return res.status(500).json({
        status: 'error',
        message: 'Password comparison error.',
      });
    }

    if (!isMatch) {
      console.log('[Auth:Login] ❌ Password mismatch for user:', user.id);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid password. Please check your password and try again.',
      });
    }
    console.log('[Auth:Login] Password verified successfully');

    // ── JWT Generation ──
    let accessToken, refreshToken;
    try {
      accessToken = generateAccessToken(user);
      refreshToken = generateRefreshToken(user);
      console.log('[Auth:Login] JWT generated successfully');
    } catch (jwtErr) {
      console.error('[Auth:Login JWT Error]:', jwtErr.message, jwtErr.stack);
      return res.status(500).json({
        status: 'error',
        message: 'JWT generation failed.',
      });
    }

    // ── Session Storage in PostgreSQL ──
    try {
      await query(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
        [user.id, refreshToken]
      );
      console.log('[Auth:Login] Session record stored');
    } catch (sessionErr) {
      console.error('[Auth:Login SQL Error] Session store warning:', sessionErr.message);
    }

    setRefreshTokenCookie(res, refreshToken, rememberMe);

    console.log('[Auth:Login] 200 OK - Login successful for:', user.email);
    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url || null,
          role: user.role,
          themePreference: user.theme_preference || 'dark',
          createdAt: user.created_at,
        },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth:Login Fatal Error]:', error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      message: `Server error during authentication: ${error.message}`,
    });
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Obtain a new Access Token using a valid Refresh Token
 * @access  Public
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required.',
      });
    }

    // Verify Refresh Token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (jwtErr) {
      console.error('[Auth:Refresh JWT Error]:', jwtErr.message);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token.',
      });
    }

    // Find User in PostgreSQL
    let userResult;
    try {
      userResult = await query('SELECT id, email, display_name, role FROM users WHERE id = $1', [decoded.id]);
    } catch (sqlErr) {
      console.error('[Auth:Refresh SQL Error]:', sqlErr.message);
      throw sqlErr;
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User account no longer exists.',
      });
    }

    const user = userResult.rows[0];
    const newAccessToken = generateAccessToken(user);
    console.log('[Auth:Refresh] Token refreshed for user:', user.id);

    return res.status(200).json({
      status: 'success',
      data: {
        token: newAccessToken,
      },
    });
  } catch (error) {
    console.error('[Auth:Refresh Error]:', error.message);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token.',
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user & invalidate session
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        await query('DELETE FROM sessions WHERE token_hash = $1', [refreshToken]);
      } catch (sqlErr) {
        console.error('[Auth:Logout SQL Error]:', sqlErr.message);
      }
    }

    res.clearCookie('refreshToken');

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('[Auth:Logout Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Error during logout.',
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    let result;
    try {
      result = await query(
        'SELECT id, email, display_name, avatar_url, role, theme_preference, created_at FROM users WHERE id = $1',
        [userId]
      );
    } catch (sqlErr) {
      console.error('[Auth:Me SQL Error]:', sqlErr.message);
      throw sqlErr;
    }

    if (result.rows.length === 0) {
      console.log('[Auth:Me] User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found.',
      });
    }

    const user = result.rows[0];

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url || null,
          role: user.role,
          themePreference: user.theme_preference || 'dark',
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error('[Auth:Me Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile.',
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
