const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('the chat list asks for online status in one call, declared before the /:conversationId routes', () => {
  const routes = read('src/routes/chatRoutes.js');
  assert.ok(routes.indexOf("router.get('/presence'") < routes.indexOf("router.get('/:conversationId/messages'"));
});

test('online status for a list: capped, and hidden if either of you hid it', () => {
  const service = read('src/services/chatService.js');
  assert.match(service, /async function onlineFor\(userId, ids\)/);
  assert.match(service, /\.slice\(0, 100\)/);
  assert.match(service, /if \(Number\(me\?\.hide_activity\) === 1\) return out;/);
  assert.match(service, /if \(Number\(row\.hide_activity\) === 1 \|\| !row\.last_active_at\) continue;/);
});
