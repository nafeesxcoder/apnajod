const express = require('express');
const safetyController = require('../controllers/safetyController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/report', safetyController.postReport);
router.post('/block', safetyController.postBlock);
router.post('/unblock', safetyController.postUnblock);
router.get('/block-status', safetyController.getBlockStatus);
router.post('/unmatch', safetyController.postUnmatch);

module.exports = router;