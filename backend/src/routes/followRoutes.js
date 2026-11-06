const express = require("express");
const rateLimit = require("express-rate-limit");
const followController = require("../controllers/followController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Username search and contact matching are the two ways to find an account,
// so both are rate limited: they are the endpoints worth scraping.
const lookupLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Too many searches. Please try again shortly." },
});
const contactsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Too many contact lookups. Please try again later." },
});

// ---- find people ----
router.get("/search", lookupLimiter, followController.search);
router.post("/contacts", contactsLimiter, followController.contacts);

// ---- my own lists ----
router.put("/privacy", followController.privacy);

// ---- someone else ----
router.get("/users/:userId", followController.userProfile);

module.exports = router;
