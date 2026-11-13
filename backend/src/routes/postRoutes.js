const express = require("express");
const rateLimit = require("express-rate-limit");
const postController = require("../controllers/postController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Comments are where spam would go: 30 in 5 minutes is far more than a
// person typing, and stops a script.
const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "You are commenting too fast. Please wait a little." },
});

router.post("/", postController.createPost);
router.get("/", postController.getMyPosts);
// The Home feed and your saved posts (before /:id, which would take
// "feed" or "saved" as an id).
router.get("/feed", postController.getFeed);
router.get("/saved", postController.getSaved);
// Someone else's posts, so a post is worth writing.
router.get("/user/:userId", postController.getUserPosts);

// One post - what a shared link opens.
router.get("/:id", postController.getPost);
router.put("/:id", postController.updatePost);
router.delete("/:id", postController.deletePost);

// Like, comment, save - Instagram's.
router.post("/:id/like", postController.likePost);
router.delete("/:id/like", postController.unlikePost);
router.get("/:id/likes", postController.getLikers);
router.get("/:id/comments", postController.getComments);
router.post("/:id/comments", commentLimiter, postController.addComment);
router.delete("/:id/comments/:commentId", postController.deleteComment);
router.post("/:id/save", postController.savePost);
router.delete("/:id/save", postController.unsavePost);

module.exports = router;
