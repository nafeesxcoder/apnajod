const express = require("express");
const postController = require("../controllers/postController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/", postController.createPost);
router.get("/", postController.getMyPosts);
// Someone else's posts, so a post is worth writing.
router.get("/user/:userId", postController.getUserPosts);
router.put("/:id", postController.updatePost);
router.delete("/:id", postController.deletePost);

module.exports = router;
