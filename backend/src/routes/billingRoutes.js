const express = require("express");
const billingController = require("../controllers/billingController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Prices are public so they can be shown before anyone signs up.
router.get("/plans", billingController.plans);

router.use(requireAuth);
router.get("/me", billingController.me);
router.post("/boost", billingController.boost);

module.exports = router;
