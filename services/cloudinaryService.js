const axios = require('axios');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isConfigured = () =>
  Boolean(CLOUD_NAME && API_KEY && API_SECRET);

const isCloudinaryUrl = (value) =>
  typeof value === 'string' && value.includes('cloudinary.com');

const extractPublicId = (imageReference) => {
  if (!imageReference || typeof imageReference !== 'string') {
    return null;
  }

  const clean = imageReference.split('?')[0];

  if (!isCloudinaryUrl(clean)) {
    const sanitized = clean.replace(/\.[^/.]+$/, '');
    return sanitized || null;
  }

  const uploadIndex = clean.indexOf('/upload/');
  if (uploadIndex === -1) {
    return null;
  }

  let publicPart = clean.substring(uploadIndex + '/upload/'.length);
  publicPart = publicPart.replace(/^v[0-9]+\/+/i, '');
  publicPart = publicPart.replace(/\.[^/.]+$/, '');
  publicPart = publicPart.replace(/^\/+/, '');

  return publicPart || null;
};

const deleteImage = async (imageReference) => {
  if (!imageReference) {
    return { deleted: false, reason: 'missing-reference' };
  }

  const publicId = extractPublicId(imageReference);
  if (!publicId) {
    return { deleted: false, reason: 'missing-public-id' };
  }

  if (!isConfigured()) {
    return { deleted: false, reason: 'cloudinary-not-configured', publicId };
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload/${encodeURIComponent(
    publicId
  )}`;

  try {
    const response = await axios.delete(endpoint, {
      auth: {
        username: API_KEY,
        password: API_SECRET
      },
      params: {
        invalidate: true
      }
    });

    return {
      deleted: response.status === 200,
      publicId,
      result: response.data
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { deleted: false, reason: 'not-found', publicId };
    }

    console.error('Cloudinary delete error:', error.response?.data || error.message);
    return { deleted: false, reason: 'error', publicId, error };
  }
};

module.exports = {
  isConfigured,
  isCloudinaryUrl,
  extractPublicId,
  deleteImage
};












