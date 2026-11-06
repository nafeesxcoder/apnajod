const http = require('http');
const app = require('./app');
const env = require('./config/env');
const realtime = require('./services/realtime');

const server = http.createServer(app);
realtime.init(server);

server.listen(env.port, () => {
  console.log(`Apnajoda backend running on http://localhost:${env.port}`);
});
