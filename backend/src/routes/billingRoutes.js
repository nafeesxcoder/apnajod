const express = require("express");
const billingController = require("../controllers/billingController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/plans", billingController.plans);

router.post("/webhook", billingController.webhook);

router.use(requireAuth);
router.get("/me", billingController.me);
router.post("/boost", billingController.boost);
router.post("/order", billingController.createOrder);
router.get("/pay-options", billingController.payOptions);
router.post("/upi", billingController.submitUpi);

module.exports = router;
