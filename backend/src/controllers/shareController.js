const asyncHandler = require("../utils/asyncHandler");
const shareService = require("../services/shareService");

/** Make a "show my family" link. Body: { targetId } - leave it out for your own profile. */
const createShare = asyncHandler(async (req, res) => {
  const result = await shareService.create(req.user.id, req.body?.targetId || null);
  res.json({ ok: true, ...result });
});

/** Open a link - public, no login. */
const viewShare = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Robots-Tag", "noindex, nofollow");
  const result = await shareService.view(req.params.token);
  res.json({ ok: true, ...result });
});

module.exports = { createShare, viewShare };
