const config = require('./config');
const connectDB = require('./config/db');
const createApp = require('./app');

async function start() {
  try {
    await connectDB();
    const app = createApp();
    app.listen(config.server.port, () => {
      console.log(`[api] listening on :${config.server.port} (${config.env})`);
    });
  } catch (err) {
    console.error('[api] failed to start:', err.message);
    process.exit(1);
  }
}

start();
