const express = require("express");
const { requireAuth } = require("../middleware/auth");
const subscriptionController = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/plans", subscriptionController.getPlans);
router.get("/my-subscription", requireAuth, subscriptionController.getUserSubscription);
router.post("/create", requireAuth, subscriptionController.createSubscription);
router.post("/cancel", requireAuth, subscriptionController.cancelSubscription);
router.get("/check-premium", requireAuth, subscriptionController.checkPremium);

module.exports = router;
