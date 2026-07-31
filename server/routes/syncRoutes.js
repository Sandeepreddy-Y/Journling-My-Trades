const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  registerSyncKey,
  receiveHeartbeat,
  syncTrade,
  getSyncStatus,
} = require('../controllers/syncController');

// EA endpoints (Authenticated via x-api-key header inside controller)
router.post('/trade', syncTrade);
router.post('/heartbeat', receiveHeartbeat);

// Web App User Endpoints (Protected by JWT auth middleware)
router.post('/register', protect, registerSyncKey);
router.get('/status', protect, getSyncStatus);

module.exports = router;
