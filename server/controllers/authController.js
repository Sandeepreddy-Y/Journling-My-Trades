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
    sameSite: 'lax',
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
      const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
      existingUser = result.rows[0];
    } else {
      existingUser = memoryDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }

    if (existingUser) {
      const accessToken = generateAccessToken(existingUser);
      const refreshToken = generateRefreshToken(existingUser);
      setRefreshTokenCookie(res, refreshToken, false);
      return res.status(200).json({
        status: 'success',
        message: 'Account signed in successfully.',
        data: {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            displayName: existingUser.display_name || existingUser.displayName || fullName.trim(),
            avatarUrl: existingUser.avatar_url || existingUser.avatarUrl,
            role: existingUser.role || 'trader',
          },
          token: accessToken,
          refreshToken,
        },
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
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
    }

    // Issue JWT Access & Refresh Tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Save refresh session
    if (pool) {
      await query(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [newUser.id, refreshToken]
      );
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
          avatarUrl: newUser.avatar_url || newUser.avatarUrl,
          role: newUser.role,
        },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error during registration.',
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
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Issue JWT Access & Refresh Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save session in DB / memoryDb
    if (pool) {
      await query(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
        [user.id, refreshToken]
      );
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
          avatarUrl: user.avatar_url || user.avatarUrl,
          role: user.role,
        },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
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

    return res.status(200).json({
      status: 'success',
      data: {
        token: newAccessToken,
      },
    });
  } catch (error) {
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
        await query('DELETE FROM sessions WHERE token_hash = $1', [refreshToken]);
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
          avatarUrl: user.avatar_url || user.avatarUrl,
          role: user.role,
        },
      },
    });
  } catch (error) {
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
