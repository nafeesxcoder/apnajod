const express = require('express');
const musicController = require('../controllers/musicController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Songs for stories (the admin adds them under /admin/music).
router.get('/', musicController.searchMusic);

module.exports = router;
