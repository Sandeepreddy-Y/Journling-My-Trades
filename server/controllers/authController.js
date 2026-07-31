const bcrypt = require('bcryptjs');
const { query, memoryDb, pool } = require('../config/db');
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
    console.log('[Auth] Register attempt:', { email, fullName: fullName?.substring(0, 20) });

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Full Name is required.',
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    let existingUser = null;
    if (pool) {
      const result = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
      existingUser = result.rows[0];
    } else {
      existingUser = memoryDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }

    if (existingUser) {
      console.log('[Auth] Register failed — duplicate email:', normalizedEmail);
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Store user
    let newUser = null;
    if (pool) {
      const insertResult = await query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, avatar_url, role, theme_preference, created_at`,
        [normalizedEmail, passwordHash, fullName.trim()]
      );
      newUser = insertResult.rows[0];
      console.log('[Auth] ✅ User registered in PostgreSQL:', newUser.id);
    } else {
      newUser = {
        id: `user-${Date.now()}`,
        email: normalizedEmail,
        password_hash: passwordHash,
        display_name: fullName.trim(),
        avatar_url: null,
        role: 'trader',
        theme_preference: 'dark',
        created_at: new Date().toISOString(),
      };
      memoryDb.users.push(newUser);
      console.log('[Auth] ✅ User registered in memory:', newUser.id);
    }

    // Issue JWT Access & Refresh Tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Save refresh session (use TEXT column, not VARCHAR for long JWTs)
    if (pool) {
      try {
        await query(
          `INSERT INTO sessions (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
          [newUser.id, refreshToken]
        );
      } catch (sessionErr) {
        console.warn('[Auth] Session save warning:', sessionErr.message);
        // Non-fatal — token still works for this request
      }
    } else {
      if (!memoryDb.sessions) memoryDb.sessions = [];
      memoryDb.sessions.push({
        user_id: newUser.id,
        token_hash: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    setRefreshTokenCookie(res, refreshToken, false);

    return res.status(201).json({
      status: 'success',
      message: 'Account registered successfully.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.display_name || newUser.displayName,
          avatarUrl: newUser.avatar_url || newUser.avatarUrl || null,
          role: newUser.role,
        },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth] ❌ Register Error:', error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      message: 'Server error during registration. Please try again.',
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
    console.log('[Auth] Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find User
    let user = null;
    if (pool) {
      const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
      user = result.rows[0];
    } else {
      user = memoryDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }

    if (!user) {
      console.log('[Auth] Login failed — user not found:', normalizedEmail);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log('[Auth] Login failed — wrong password for:', normalizedEmail);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    console.log('[Auth] ✅ Login success:', user.id);

    // Issue JWT Access & Refresh Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save session in DB / memoryDb
    if (pool) {
      try {
        await query(
          `INSERT INTO sessions (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
          [user.id, refreshToken]
        );
      } catch (sessionErr) {
        console.warn('[Auth] Session save warning:', sessionErr.message);
      }
    } else {
      if (!memoryDb.sessions) memoryDb.sessions = [];
      memoryDb.sessions.push({
        user_id: user.id,
        token_hash: refreshToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    setRefreshTokenCookie(res, refreshToken, rememberMe);

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name || user.displayName,
          avatarUrl: user.avatar_url || user.avatarUrl || null,
          role: user.role,
        },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth] ❌ Login Error:', error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      message: 'Server error during authentication.',
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
    const decoded = verifyRefreshToken(refreshToken);

    // Find User
    let user = null;
    if (pool) {
      const result = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      user = result.rows[0];
    } else {
      user = memoryDb.users.find((u) => u.id === decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User account no longer exists.',
      });
    }

    // Generate new Access Token
    const newAccessToken = generateAccessToken(user);
    console.log('[Auth] ✅ Token refreshed for user:', user.id);

    return res.status(200).json({
      status: 'success',
      data: {
        token: newAccessToken,
      },
    });
  } catch (error) {
    console.log('[Auth] Refresh token invalid or expired');
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
      if (pool) {
        await query('DELETE FROM sessions WHERE token_hash = $1', [refreshToken]).catch(() => {});
      } else if (memoryDb.sessions) {
        memoryDb.sessions = memoryDb.sessions.filter((s) => s.token_hash !== refreshToken);
      }
    }

    res.clearCookie('refreshToken');

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
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

    let user = null;
    if (pool) {
      const result = await query(
        'SELECT id, email, display_name, avatar_url, role, theme_preference, created_at FROM users WHERE id = $1',
        [userId]
      );
      user = result.rows[0];
    } else {
      user = memoryDb.users.find((u) => u.id === userId);
    }

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name || user.displayName,
          avatarUrl: user.avatar_url || user.avatarUrl || null,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('[Auth] getMe error:', error.message);
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
