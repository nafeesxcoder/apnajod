const express = require("express");
const dailyQuestionController = require("../controllers/dailyQuestionController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", dailyQuestionController.getToday);
router.post("/answer", dailyQuestionController.answerToday);

module.exports = router;
