const express = require("express");
const rateLimit = require("express-rate-limit");
const shareController = require("../controllers/shareController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Opening a link needs no account - that is the point - so it is rate
// limited by address to stop anyone guessing tokens in bulk.
const viewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Too many requests. Please try again shortly." },
});

router.get("/:token", viewLimiter, shareController.viewShare);
router.post("/", requireAuth, shareController.createShare);

module.exports = router;
