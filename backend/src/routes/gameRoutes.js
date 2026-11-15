const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const coins = require("../services/coinService");

/** Game coins: the wallet, the store, the daily spinner and the weekly leaderboard. */
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

router.get("/wallet", handle(async (req) => ({ wallet: await coins.wallet(req.user.id) })));
router.post("/unlock", handle(async (req) => ({ wallet: await coins.unlock(req.user.id, req.body?.key) })));
router.post("/exchange", handle(async (req) => ({ wallet: await coins.exchange(req.user.id, req.body?.what) })));
router.post("/spin", handle(async (req) => coins.spin(req.user.id)));
router.get("/leaderboard", handle(async (req) => ({ players: await coins.leaderboard(req.user.id) })));

module.exports = router;
