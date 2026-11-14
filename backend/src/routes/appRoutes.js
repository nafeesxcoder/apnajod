const express = require("express");
const festivalService = require("../services/festivalService");

const router = express.Router();

// The festival theme on now (Diwali, Eid...). Public and cheap: the app
// asks when it opens and every few minutes.
router.get("/theme", async (req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    res.json({ ok: true, theme: await festivalService.active() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
