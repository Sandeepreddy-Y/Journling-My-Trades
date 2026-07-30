const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { query, pool } = require('../config/db');

/**
 * @route   POST /api/upload
 * @desc    Upload chart screenshot (Before / After entry) to Cloudinary or DB
 * @access  Private
 */
const uploadScreenshot = async (req, res) => {
  try {
    const { image, tradeId, type = 'before' } = req.body;

    if (!image) {
      return res.status(400).json({
        status: 'error',
        message: 'No image data provided for upload.',
      });
    }

    // Upload to Cloudinary or get URL
    const result = await uploadToCloudinary(image, 'tradetrack_screenshots');

    // If tradeId provided, update PostgreSQL database
    if (tradeId && pool) {
      const column = type === 'after' ? 'after_screenshot' : 'before_screenshot';
      await query(
        `UPDATE trades SET ${column} = $1, updated_at = NOW() WHERE id = $2`,
        [result.url, tradeId]
      );

      // Record in trade_screenshots table
      await query(
        `INSERT INTO trade_screenshots (trade_id, url, public_id, caption)
         VALUES ($1, $2, $3, $4)`,
        [tradeId, result.url, result.publicId, `${type.toUpperCase()} Entry Chart`]
      );
    }

    return res.status(200).json({
      status: 'success',
      message: 'Screenshot uploaded successfully.',
      data: {
        url: result.url,
        publicId: result.publicId,
        type,
      },
    });
  } catch (error) {
    console.error('[Upload Error]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to upload screenshot.',
    });
  }
};

/**
 * @route   DELETE /api/upload
 * @desc    Delete chart screenshot
 * @access  Private
 */
const deleteScreenshot = async (req, res) => {
  try {
    const { publicId, tradeId, type } = req.body;

    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    if (tradeId && type && pool) {
      const column = type === 'after' ? 'after_screenshot' : 'before_screenshot';
      await query(`UPDATE trades SET ${column} = NULL WHERE id = $1`, [tradeId]);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Screenshot deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete screenshot.',
    });
  }
};

module.exports = {
  uploadScreenshot,
  deleteScreenshot,
};
