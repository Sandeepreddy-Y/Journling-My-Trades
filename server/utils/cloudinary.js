let cloudinary = null;

try {
  const cloudinaryModule = require('cloudinary');
  cloudinary = cloudinaryModule.v2;

  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
} catch (e) {
  console.log('[Cloudinary] SDK not installed or configured. Operating in direct URL / Data URI mode.');
}

/**
 * Upload image to Cloudinary (or return input data URL if Cloudinary is unconfigured)
 */
const uploadToCloudinary = async (fileString, folder = 'tradetrack_screenshots') => {
  if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
    const res = await cloudinary.uploader.upload(fileString, {
      folder,
      resource_type: 'image',
    });
    return {
      url: res.secure_url,
      publicId: res.public_id,
    };
  }

  // Fallback: return data URI / string directly
  return {
    url: fileString,
    publicId: `img-${Date.now()}`,
  };
};

/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME && publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
  return true;
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
