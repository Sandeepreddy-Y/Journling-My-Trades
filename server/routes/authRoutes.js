const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refresh,
  logout,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public Auth Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Protected Auth Endpoints
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
