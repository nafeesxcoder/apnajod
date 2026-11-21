const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Public events (no auth required, but tracked)
router.post("/event", analyticsController.trackEvent);

// User metrics (requires auth)
router.use(requireAuth);
router.get("/metrics", analyticsController.getUserMetrics);

module.exports = router;
