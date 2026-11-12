const http = require('http');
const app = require('./app');
const env = require('./config/env');
const realtime = require('./services/realtime');

const server = http.createServer(app);
realtime.init(server);

server.listen(env.port, () => {
  console.log(`Apnajoda backend running on http://localhost:${env.port}`);
  // "Your turn" pushes for unanswered chats. Started here, not in app.js,
  // so tests that load the app never start a timer.
  require('./services/replyReminderService').start();
  // The 9 PM "Aaj ke 5 are here" push.
  require('./services/dailyPicksService').start();
});
