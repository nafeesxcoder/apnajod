const express = require('express');
const coupleController = require('../controllers/coupleController');
const { requireAuth } = require('../middleware/auth');

const rateLimit = require('express-rate-limit');

const router = express.Router();
const contactsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many contact lookups. Please try again later.' },
});
router.use(requireAuth);

router.get('/hub', coupleController.getHub);
router.get('/search', coupleController.searchPartner);
router.post('/contacts/match', contactsLimiter, coupleController.matchContacts);
router.get('/partner/:connectionId', coupleController.getPartnerProfile);
router.post('/request', coupleController.sendRequest);
router.post('/respond', coupleController.respondRequest);
router.put('/mode', coupleController.setMode);
router.post('/disconnect', coupleController.disconnect);

module.exports = router;
