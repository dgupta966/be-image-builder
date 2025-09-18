const Server = require('./server');

const server = new Server();
server.start().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});