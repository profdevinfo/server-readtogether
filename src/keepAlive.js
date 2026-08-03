/**
 * Keep-alive mechanism to prevent Render free tier from sleeping.
 *
 * Render free instances sleep after 15 minutes of inactivity, causing 50+ second
 * delays on the first request. This module pings the server's own health endpoint
 * every 10 minutes to keep it awake.
 *
 * Usage (in server.js):
 *   if (process.env.NODE_ENV === 'production') {
 *     require('./keepAlive').start();
 *   }
 */

const http = require('http');
const https = require('https');

const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
let intervalId = null;

function getServerUrl() {
  // Use RENDER_EXTERNAL_URL if available (Render sets this automatically)
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  // Fallback to localhost for testing
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

function ping() {
  const url = getServerUrl();
  const client = url.startsWith('https') ? https : http;

  const req = client.get(url, (res) => {
    console.log(`[KeepAlive] Pinged ${url} — status: ${res.statusCode}`);
  });

  req.on('error', (err) => {
    console.error(`[KeepAlive] Ping failed: ${err.message}`);
  });

  // Timeout after 10 seconds
  req.setTimeout(10000, () => {
    req.destroy();
  });
}

function start() {
  if (intervalId) {
    console.log('[KeepAlive] Already running');
    return;
  }

  console.log('[KeepAlive] Starting keep-alive pings every 10 minutes');
  ping(); // Ping immediately
  intervalId = setInterval(ping, PING_INTERVAL);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[KeepAlive] Stopped');
  }
}

module.exports = { start, stop };
