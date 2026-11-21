const express = require("express");
const referralController = require("../controllers/referralController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", referralController.getSummary);
router.get("/link", referralController.getInviteLink);

module.exports = router;
