const asyncHandler = require("../utils/asyncHandler");
const referralService = require("../services/referralService");

const getSummary = asyncHandler(async (req, res) => {
  const summary = await referralService.summaryFor(req.user.id);
  res.json({ ok: true, ...summary });
});

const getInviteLink = asyncHandler(async (req, res) => {
  const { username } = await require("../config/db").query(
    "SELECT username FROM users WHERE id = ? LIMIT 1",
    [req.user.id]
  ).then(rows => rows[0] || {});

  if (!username) {
    return res.status(400).json({ ok: false, error: "Username not set" });
  }

  const link = `https://apnajoda.com/?invite=${encodeURIComponent(username)}`;
  res.json({ ok: true, link, username });
});

module.exports = {
  getSummary,
  getInviteLink,
};
