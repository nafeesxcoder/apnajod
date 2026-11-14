const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const ludo = require("../services/ludoService");

/** Ludo for 2 to 4 players. Every call answers with the game as it now is. */
const router = express.Router();
router.use(requireAuth);

const handle = (work) =>
  asyncHandler(async (req, res) => {
    try {
      res.json({ ok: true, ...(await work(req)) });
    } catch (error) {
      if (error && error.status) throw new ApiError(error.status, error.message);
      throw error;
    }
  });

router.get("/", handle(async (req) => ({ games: await ludo.mine(req.user.id) })));
router.post("/", handle(async (req) => ({ game: await ludo.create(req.user.id, req.body || {}) })));
router.get("/:id", handle(async (req) => ({ game: await ludo.get(req.user.id, req.params.id) })));
router.post("/:id/invite", handle(async (req) => ({ game: await ludo.invite(req.user.id, req.params.id, req.body?.userIds) })));
router.post("/:id/join", handle(async (req) => ({ game: await ludo.join(req.user.id, req.params.id) })));
router.post("/:id/decline", handle(async (req) => ludo.decline(req.user.id, req.params.id)));
router.post("/:id/start", handle(async (req) => ({ game: await ludo.start(req.user.id, req.params.id) })));
router.post("/:id/roll", handle(async (req) => ({ game: await ludo.roll(req.user.id, req.params.id) })));
router.post("/:id/move", handle(async (req) => ({ game: await ludo.move(req.user.id, req.params.id, req.body?.token) })));
router.post("/:id/leave", handle(async (req) => ludo.leave(req.user.id, req.params.id)));

module.exports = router;
