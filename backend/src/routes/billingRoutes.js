const express = require("express");
const billingController = require("../controllers/billingController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/plans", billingController.plans);

router.post("/webhook", billingController.webhook);
// Google Play's notifications: Google calls this, not a member, so it has its own secret.
router.post("/play/notify", billingController.playNotify);

router.use(requireAuth);
router.get("/me", billingController.me);
router.post("/boost", billingController.boost);
router.post("/order", billingController.createOrder);
router.post("/verify", billingController.verify);
router.post("/play/verify", billingController.playVerify);
router.get("/play/status", billingController.playStatus);
router.get("/pay-options", billingController.payOptions);
router.post("/upi", billingController.submitUpi);
router.post("/coupon", billingController.checkCoupon);

module.exports = router;
