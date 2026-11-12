const asyncHandler = require("../utils/asyncHandler");
const dailyQuestionService = require("../services/dailyQuestionService");

const getToday = asyncHandler(async (req, res) => {
  const today = await dailyQuestionService.forMember(req.user.id);
  res.json({ ok: true, ...today });
});

const answerToday = asyncHandler(async (req, res) => {
  const { questionId, answer } = req.body || {};
  const result = await dailyQuestionService.answer(req.user.id, questionId, answer);
  res.json(result);
});

module.exports = { getToday, answerToday };
