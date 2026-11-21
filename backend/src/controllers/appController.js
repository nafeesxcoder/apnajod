const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../config/db");

/**
 * Check if app update is available
 * Returns: { available: boolean, version, url, force: boolean }
 */
const checkUpdate = asyncHandler(async (req, res) => {
  const { currentVersion, platform } = req.query;

  if (!currentVersion || !platform) {
    return res.status(400).json({ error: "currentVersion and platform required" });
  }

  // Latest versions (should be in a config or database in production)
  const latestVersions = {
    ios: "1.2.5",
    android: "1.2.5",
  };

  const latestVersion = latestVersions[platform] || latestVersions.android;
  const hasUpdate = currentVersion < latestVersion;

  res.json({
    ok: true,
    available: hasUpdate,
    version: latestVersion,
    url: hasUpdate
      ? `https://play.google.com/store/apps/details?id=com.apnajoda.app`
      : null,
    force: false, // Set to true to force update
    releaseNotes: hasUpdate
      ? "नई features और bug fixes"
      : null,
  });
});

/**
 * Report app crash
 */
const reportCrash = asyncHandler(async (req, res) => {
  const { version, platform, screen, message, stack, timestamp } = req.body;

  console.log(`[CRASH] ${platform} ${version} @ ${screen}\n${message}\n${stack}`);

  res.json({ ok: true });
});

/**
 * Get app config (feature flags, maintenance mode, etc)
 */
const getConfig = asyncHandler(async (req, res) => {
  const config = {
    ok: true,
    maintenance: false,
    maintenanceMessage: null,
    features: {
      playStoreEnabled: false,
      premiumGirlsOffer: false,
      ludoEnabled: true,
      videoCalls: true,
      liveChat: true,
    },
    urls: {
      playStore: "https://play.google.com/store/apps/details?id=com.apnajoda.app",
      website: "https://apnajoda.com",
      privacy: "https://apnajoda.com/privacy",
      terms: "https://apnajoda.com/terms",
    },
  };

  res.json(config);
});

module.exports = {
  checkUpdate,
  reportCrash,
  getConfig,
};
