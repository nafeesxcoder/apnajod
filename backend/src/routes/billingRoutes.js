const express = require("express");
const billingController = require("../controllers/billingController");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/plans", billingController.plans);

// Google Play's notifications: Google calls this, not a member, so it has its own secret.
router.post("/play/notify", billingController.playNotify);

router.use(requireAuth);
router.get("/me", billingController.me);
router.post("/boost", billingController.boost);
router.get("/pass-codes", billingController.passCodes);
// Pass codes: a few tries per member, so codes cannot be guessed.
router.post(
  "/redeem-code",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many tries. Wait a few minutes and try again." },
  }),
  billingController.redeemCode,
);
router.post("/play/verify", billingController.playVerify);
router.get("/play/status", billingController.playStatus);

module.exports = router;
