const express = require('express');
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');
const chatUpload = require('../middleware/chatUpload');

const rateLimit = require('express-rate-limit');

const gifLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `gif:${req.user?.id || req.ip}`,
  message: { error: 'Too many GIF searches. Please wait a moment.' },
});

const router = express.Router();
router.use(requireAuth);

router.get('/gifs/status', chatController.gifStatus);
router.get('/gifs', gifLimiter, chatController.searchGifs);
// Declared before the /:conversationId routes so it is not captured by them.
router.get('/conversations', chatController.listConversations);
router.get('/:conversationId/messages', chatController.getMessages);
router.get('/:conversationId/icebreakers', chatController.getIcebreakers);
router.post('/:conversationId/messages', chatController.postMessage);
router.post('/:conversationId/date-proposal', chatController.postDateProposal);
router.put('/date-proposal/status', chatController.putDatePlanStatus);
router.post('/:conversationId/location', chatController.postLocation);
router.get('/:conversationId/presence', chatController.getPresence);
router.get('/:conversationId/streak', chatController.getStreak);
router.post('/:conversationId/typing', chatController.postTyping);
router.put('/:conversationId/messages/:messageId', chatController.putEditMessage);
router.delete('/:conversationId/messages/:messageId', chatController.deleteMessageHandler);
router.put('/:conversationId/messages/:messageId/state', chatController.putMessageState);
router.get('/:conversationId/settings', chatController.getSettingsHandler);
router.put('/:conversationId/settings', chatController.putSettingsHandler);
router.post('/upload', chatUpload.single('file'), chatController.uploadMedia);

module.exports = router;