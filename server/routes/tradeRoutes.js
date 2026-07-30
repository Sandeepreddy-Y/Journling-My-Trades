const express = require('express');
const router = express.Router();
const {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
  uploadScreenshot,
  importTrades,
} = require('../controllers/tradeController');
const { protect } = require('../middleware/authMiddleware');

// All Trade Routes are JWT Protected
router.use(protect);

router.post('/import', importTrades);

router.route('/')
  .post(createTrade)
  .get(getTrades);

router.route('/:id')
  .get(getTradeById)
  .put(updateTrade)
  .delete(deleteTrade);

router.post('/:id/screenshots', uploadScreenshot);

module.exports = router;
