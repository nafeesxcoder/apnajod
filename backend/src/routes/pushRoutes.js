const express = require("express");
const pushController = require("../controllers/pushController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/public-key", pushController.getPublicKey);
router.use(requireAuth);
router.post("/subscribe", pushController.subscribe);
router.post("/unsubscribe", pushController.unsubscribe);

module.exports = router;
