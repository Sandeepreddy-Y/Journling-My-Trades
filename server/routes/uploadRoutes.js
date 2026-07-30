const express = require('express');
const router = express.Router();
const { uploadScreenshot, deleteScreenshot } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, uploadScreenshot);
router.delete('/', protect, deleteScreenshot);

module.exports = router;
