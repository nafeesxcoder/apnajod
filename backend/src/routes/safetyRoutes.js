const express = require('express');
const safetyController = require('../controllers/safetyController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/report', safetyController.postReport);
router.post('/block', safetyController.postBlock);
router.post('/unblock', safetyController.postUnblock);
router.get('/block-status', safetyController.getBlockStatus);
router.get('/blocked', safetyController.getBlocked);
router.get('/summary', safetyController.getSummary);
router.put('/activity-status', safetyController.putActivityStatus);
router.post('/unmatch', safetyController.postUnmatch);

module.exports = router;