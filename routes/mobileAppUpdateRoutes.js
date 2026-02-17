const express = require('express');
const { AppVersion } = require('../models');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// Version comparison utility function
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }

  return 0;
}

// Extract version from user agent or headers
function extractCurrentVersion(req) {
  // Try to get version from custom header first
  const versionHeader = req.headers['x-app-version'] || req.headers['app-version'];
  if (versionHeader) {
    return versionHeader;
  }

  // Try to extract from user agent
  const userAgent = req.headers['user-agent'] || '';
  const versionMatch = userAgent.match(/MandapamApp\/(\d+\.\d+\.\d+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  // Default fallback version
  return '1.0.0';
}

// @desc    Check if app update is available
// @route   GET /api/mobile/app/update-check
// @access  Private (optional authentication)
router.get('/app/update-check', async (req, res) => {
  try {
    const currentVersion = extractCurrentVersion(req);
    const platform = req.headers['x-platform'] || req.headers['platform'] || 'both';
    
    console.log('Update check request:', { currentVersion, platform });

    // Find the latest version for the platform
    const latestVersion = await AppVersion.findOne({
      where: {
        isLatest: true,
        [require('sequelize').Op.or]: [
          { platform: 'both' },
          { platform: platform.toLowerCase() }
        ]
      },
      order: [['releaseDate', 'DESC']]
    });

    if (!latestVersion) {
      return res.status(404).json({
        success: false,
        message: 'No version information available'
      });
    }

    // Compare versions
    const versionComparison = compareVersions(currentVersion, latestVersion.version);
    const updateAvailable = versionComparison < 0;

    // Check if force update is required
    let forceUpdate = false;
    if (latestVersion.minSupportedVersion) {
      const minVersionComparison = compareVersions(currentVersion, latestVersion.minSupportedVersion);
      forceUpdate = minVersionComparison < 0;
    }

    // Determine update URL based on platform
    let updateUrl = latestVersion.updateUrlAndroid; // Default to Android
    if (platform.toLowerCase() === 'ios' && latestVersion.updateUrlIos) {
      updateUrl = latestVersion.updateUrlIos;
    }

    const response = {
      success: true,
      message: 'Update check successful',
      data: {
        currentVersion,
        latestVersion: latestVersion.version,
        updateAvailable,
        forceUpdate,
        updateUrl: updateUrl || 'https://play.google.com/store/apps/details?id=com.mandapam.expo',
        releaseNotes: latestVersion.releaseNotes || 'Bug fixes and performance improvements',
        releaseDate: latestVersion.releaseDate,
        minSupportedVersion: latestVersion.minSupportedVersion || '1.0.0'
      }
    };

    console.log('Update check response:', response.data);
    res.status(200).json(response);

  } catch (error) {
    console.error('App update check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check for updates',
      error: 'Database connection error'
    });
  }
});

// @desc    Get detailed app version information
// @route   GET /api/mobile/app/version
// @access  Private (optional authentication)
router.get('/app/version', async (req, res) => {
  try {
    const currentVersion = extractCurrentVersion(req);
    const platform = req.headers['x-platform'] || req.headers['platform'] || 'both';
    
    console.log('Version info request:', { currentVersion, platform });

    // Find the latest version for the platform
    const latestVersion = await AppVersion.findOne({
      where: {
        isLatest: true,
        [require('sequelize').Op.or]: [
          { platform: 'both' },
          { platform: platform.toLowerCase() }
        ]
      },
      order: [['releaseDate', 'DESC']]
    });

    if (!latestVersion) {
      return res.status(404).json({
        success: false,
        message: 'No version information available'
      });
    }

    // Compare versions
    const versionComparison = compareVersions(currentVersion, latestVersion.version);
    const updateAvailable = versionComparison < 0;

    // Check if force update is required
    let forceUpdate = false;
    if (latestVersion.minSupportedVersion) {
      const minVersionComparison = compareVersions(currentVersion, latestVersion.minSupportedVersion);
      forceUpdate = minVersionComparison < 0;
    }

    // Determine update URL based on platform
    let updateUrl = latestVersion.updateUrlAndroid; // Default to Android
    if (platform.toLowerCase() === 'ios' && latestVersion.updateUrlIos) {
      updateUrl = latestVersion.updateUrlIos;
    }

    const response = {
      success: true,
      message: 'Version info retrieved successfully',
      data: {
        currentVersion,
        latestVersion: latestVersion.version,
        updateAvailable,
        forceUpdate,
        updateUrl: updateUrl || 'https://play.google.com/store/apps/details?id=com.mandapam.expo',
        releaseNotes: latestVersion.releaseNotes || 'Bug fixes and performance improvements',
        releaseDate: latestVersion.releaseDate,
        minSupportedVersion: latestVersion.minSupportedVersion || '1.0.0'
      }
    };

    console.log('Version info response:', response.data);
    res.status(200).json(response);

  } catch (error) {
    console.error('App version info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve version information',
      error: 'Database connection error'
    });
  }
});

module.exports = router;
