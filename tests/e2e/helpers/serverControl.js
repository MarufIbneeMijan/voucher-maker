/**
 * serverControl.js
 * Opaque-box HTTP test server harness for TravelLedger E2E tests.
 * Manages server startup, dynamic port binding, graceful teardown,
 * and standard HTTP API requests.
 */

const http = require('http');
const path = require('path');
const { ensureDataDir } = require('../../../server/services/jsonDb');
const { ensureDefaultAdmin } = require('../../../server/services/authService');

let activeServer = null;
let activeBaseUrl = null;

/**
 * Starts an isolated test server instance or connects to an existing server.
 * @param {number} [preferredPort=0] - 0 for dynamic ephemeral port, or explicit port
 * @returns {Promise<{ baseUrl: string, stopServer: Function }>}
 */
async function startTestServer(preferredPort = 0) {
  if (activeServer && activeBaseUrl) {
    return { baseUrl: activeBaseUrl, stopServer };
  }

  // Ensure JSON database directory and default admin are initialized
  await ensureDataDir();
  await ensureDefaultAdmin();

  const app = require('../../../server/index');

  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.listen(preferredPort, '127.0.0.1', () => {
      const address = server.address();
      const port = address.port;
      activeServer = server;
      activeBaseUrl = `http://127.0.0.1:${port}`;
      resolve({ baseUrl: activeBaseUrl, stopServer });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Gracefully shuts down the active test server.
 */
async function stopServer() {
  if (!activeServer) return;

  return new Promise((resolve) => {
    activeServer.close(() => {
      activeServer = null;
      activeBaseUrl = null;
      resolve();
    });
  });
}

/**
 * Performs an HTTP request against the test server.
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} endpoint - Path (e.g. '/api/auth/login')
 * @param {object|null} [body=null] - JSON body payload
 * @param {object} [headers={}] - Custom headers
 * @returns {Promise<{ status: number, headers: object, data: any, rawText: string }>}
 */
async function apiRequest(method, endpoint, body = null, headers = {}) {
  if (!activeBaseUrl) {
    await startTestServer();
  }

  const url = new URL(endpoint, activeBaseUrl);
  const payloadStr = body !== null && body !== undefined ? JSON.stringify(body) : null;

  const reqHeaders = {
    ...headers
  };

  if (payloadStr) {
    reqHeaders['Content-Type'] = 'application/json';
    reqHeaders['Content-Length'] = Buffer.byteLength(payloadStr);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let rawData = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          rawData += chunk;
        });

        res.on('end', () => {
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch (_) {
            parsedData = rawData;
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData,
            rawText: rawData
          });
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (payloadStr) {
      req.write(payloadStr);
    }
    req.end();
  });
}

/**
 * Helper to log in and obtain a JWT token.
 * @param {string} [username='admin']
 * @param {string} [password='admin']
 * @returns {Promise<{ token: string, user: object }>}
 */
async function loginAs(username = 'admin', password = 'admin') {
  const res = await apiRequest('POST', '/api/auth/login', { username, password });
  if (res.status !== 200 || !res.data || !res.data.token) {
    throw new Error(`Login failed for ${username}: status ${res.status} - ${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.token,
    user: res.data.user
  };
}

module.exports = {
  startTestServer,
  stopServer,
  apiRequest,
  loginAs,
  getBaseUrl: () => activeBaseUrl
};
