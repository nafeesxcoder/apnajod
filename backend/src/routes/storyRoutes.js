const express = require('express');
const rateLimit = require('express-rate-limit');
const storyController = require('../controllers/storyController');
const { requireAuth } = require('../middleware/auth');
const { storyUpload } = require('../middleware/storyUpload');

const router = express.Router();
router.use(requireAuth);

// Uploads are the heavy part on a small server: 20 in 10 minutes is far
// more than a person, and stops a script.
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many stories at once. Please wait a little.' },
});

// Answers are typed by people: 30 in 10 minutes is plenty, and stops a script.
const answerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many answers at once. Please wait a little.' },
});

router.get('/', storyController.getTray);
router.post('/', uploadLimiter, storyUpload.single('photo'), storyController.createStory);
router.delete('/:id', storyController.deleteStory);
router.post('/:id/vote', storyController.voteStory);
router.post('/:id/answer', answerLimiter, storyController.answerStory);
router.get('/:id/responses', storyController.storyResponses);

module.exports = router;
