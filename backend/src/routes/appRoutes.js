const express = require("express");
const festivalService = require("../services/festivalService");
const promoService = require("../services/promoService");
const appController = require("../controllers/appController");

const router = express.Router();

// The festival theme on now (Diwali, Eid...). Public and cheap: the app
// asks when it opens and every few minutes.
router.get("/theme", async (req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    // The offer popup rides along: the app asks once for both.
    res.json({ ok: true, theme: await festivalService.active(), promo: await promoService.active() });
  } catch (error) {
    next(error);
  }
});

// OTA Update check
router.get("/check-update", appController.checkUpdate);

// App config (feature flags, maintenance mode)
router.get("/config", appController.getConfig);

// Report app crashes
router.post("/crash", appController.reportCrash);

module.exports = router;
