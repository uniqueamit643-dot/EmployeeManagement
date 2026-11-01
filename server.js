const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
loadEnv(path.join(ROOT, '.env'));

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
const passwordSalt = process.env.ADMIN_PASSWORD_SALT;
const port = Number(process.env.PORT || 3000);
const secureCookie = process.env.NODE_ENV === 'production';
if (!username || !password || !passwordSalt) {
  console.error('Missing ADMIN_USERNAME, ADMIN_PASSWORD, or ADMIN_PASSWORD_SALT. See .env.example.');
  process.exit(1);
}
if (password.length < 16) {
  console.error('ADMIN_PASSWORD must contain at least 16 characters.');
  process.exit(1);
}

const passwordHash = crypto.scryptSync(password, passwordSalt, 64);
const sessions = new Map();
const attempts = new Map();
const SESSION_TTL = 8 * 60 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders(), ...extraHeaders });
  res.end(JSON.stringify(payload));
}
function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  };
}
function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookie ? '; Secure' : ''}`;
}
function getSession(req) {
  const raw = req.headers.cookie || '';
  const value = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith('owner_session='))?.slice('owner_session='.length);
  if (!value) return null;
  const session = sessions.get(value);
  if (!session || session.expires < Date.now()) {
    sessions.delete(value);
    return null;
  }
  return { id: value, ...session };
}
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 16_384) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function clientKey(req) { return req.socket.remoteAddress || 'unknown'; }
function staticFile(res, pathname) {
  const knownRoutes = { '/': 'index.html', '/login': 'login.html', '/admin': 'admin.html' };
  const assets = new Set(['index.html', 'login.html', 'styles.css', 'script.js', 'login.js', 'admin.js']);
  const relative = knownRoutes[pathname] || pathname.replace(/^\/+/, '');
  if (!(pathname === '/admin' && relative === 'admin.html') && !assets.has(relative)) return sendJson(res, 404, { error: 'Not found' });
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return sendJson(res, 404, { error: 'Not found' });
  if (!['.html', '.css', '.js', '.svg', '.png', '.jpg', '.webp', '.ico'].includes(path.extname(file))) return sendJson(res, 404, { error: 'Not found' });
  fs.readFile(file, (error, content) => {
    if (error) return sendJson(res, 404, { error: 'Not found' });
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': path.extname(file) === '.html' ? 'no-store' : 'public, max-age=3600', ...securityHeaders() });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'POST' && !isSameOrigin(req)) return sendJson(res, 403, { error: 'Request origin rejected.' });
  if (url.pathname === '/api/admin/session' && req.method === 'GET') {
    const session = getSession(req);
    return sendJson(res, session ? 200 : 401, session ? { authenticated: true, username: session.username } : { authenticated: false });
  }
  if (url.pathname === '/api/admin/login' && req.method === 'POST') {
    const key = clientKey(req);
    const record = attempts.get(key) || { count: 0, lockedUntil: 0 };
    if (record.lockedUntil > Date.now()) return sendJson(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' }, { 'Retry-After': String(Math.ceil((record.lockedUntil - Date.now()) / 1000)) });
    let data;
    try { data = await readJson(req); } catch (error) { return sendJson(res, error.status || 400, { error: 'Invalid request.' }); }
    const attemptedName = typeof data.username === 'string' ? data.username : '';
    const attemptedPassword = typeof data.password === 'string' ? data.password : '';
    const attemptedHash = crypto.scryptSync(attemptedPassword.slice(0, 256), passwordSalt, 64);
    const nameMatches = attemptedName === username;
    const passwordMatches = crypto.timingSafeEqual(passwordHash, attemptedHash);
    if (!nameMatches || !passwordMatches) {
      record.count += 1;
      if (record.count >= MAX_ATTEMPTS) { record.count = 0; record.lockedUntil = Date.now() + LOCKOUT_MS; }
      attempts.set(key, record);
      return sendJson(res, record.lockedUntil ? 429 : 401, { error: record.lockedUntil ? 'Too many attempts. Try again in 15 minutes.' : 'Username or password is incorrect.' });
    }
    attempts.delete(key);
    const id = crypto.randomBytes(32).toString('base64url');
    sessions.set(id, { username, expires: Date.now() + SESSION_TTL });
    return sendJson(res, 200, { authenticated: true }, { 'Set-Cookie': cookie('owner_session', id, SESSION_TTL / 1000) });
  }
  if (url.pathname === '/api/admin/logout' && req.method === 'POST') {
    const session = getSession(req);
    if (session) sessions.delete(session.id);
    return sendJson(res, 200, { authenticated: false }, { 'Set-Cookie': cookie('owner_session', '', 0) });
  }
  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD', ...securityHeaders() }); return res.end(); }
  if (url.pathname === '/admin') {
    const session = getSession(req);
    if (!session) { res.writeHead(302, { Location: '/login', 'Cache-Control': 'no-store', ...securityHeaders() }); return res.end(); }
  }
  staticFile(res, url.pathname);
});

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) if (session.expires < now) sessions.delete(id);
  for (const [key, attempt] of attempts) if (attempt.lockedUntil && attempt.lockedUntil < now && attempt.count === 0) attempts.delete(key);
}, 60_000).unref();

server.listen(port, () => console.log(`Noida Eye and Medical Centre running at http://localhost:${port}`));
