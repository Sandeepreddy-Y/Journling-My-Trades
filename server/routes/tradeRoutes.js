const express = require('express');
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

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

router.post('/import', upload.single('file'), importTrades);

router.route('/')
  .post(createTrade)
  .get(getTrades);

router.route('/:id')
  .get(getTradeById)
  .put(updateTrade)
  .delete(deleteTrade);

router.post('/:id/screenshots', uploadScreenshot);

module.exports = router;
