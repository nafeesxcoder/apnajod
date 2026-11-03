const express = require("express");
const postController = require("../controllers/postController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/", postController.createPost);
router.get("/", postController.getMyPosts);
router.delete("/:id", postController.deletePost);

module.exports = router;
