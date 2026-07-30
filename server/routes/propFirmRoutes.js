const express = require('express');
const router = express.Router();
const { getPropFirmAccounts, createPropFirmAccount } = require('../controllers/propFirmController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getPropFirmAccounts)
  .post(createPropFirmAccount);

module.exports = router;
