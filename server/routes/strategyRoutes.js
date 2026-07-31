const express = require('express');
const router = express.Router();
const {
  getStrategies,
  createStrategy,
  deleteStrategy,
} = require('../controllers/strategyController');
const { protect } = require('../middleware/authMiddleware');

// All Strategy Routes are JWT Protected
router.use(protect);

router.route('/')
  .get(getStrategies)
  .post(createStrategy);

router.delete('/:id', deleteStrategy);

module.exports = router;
