const express = require('express');
const closeFriendsController = require('../controllers/closeFriendsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Your close friends list: who sees your close-friends stories.
router.get('/', closeFriendsController.listCloseFriends);
router.put('/:userId', closeFriendsController.setCloseFriend);

module.exports = router;
