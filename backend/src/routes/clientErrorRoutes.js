const express = require('express');
const rateLimit = require('express-rate-limit');

/**
 * When the app crashes, it sends what went wrong here, and it is written to
 * the server log ("[APP CRASH]", see pm2 logs) - so a crash on someone's
 * phone can be found and fixed. Nothing is saved in the database.
 */
const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const clip = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000B-\u001F]/g, '').slice(0, max);

router.post('/', limiter, (req, res) => {
  const body = req.body || {};
  console.log(
    `[APP CRASH] ${clip(body.platform, 12)} ${clip(body.version, 20)} ${clip(body.screen, 40)}: ${clip(body.message, 300)}\n` +
      `${clip(body.stack, 1500)}\n--- component stack ---\n${clip(body.componentStack, 1500)}`,
  );
  res.json({ ok: true });
});

module.exports = router;
