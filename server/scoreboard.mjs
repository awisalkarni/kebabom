import { createServer } from 'node:http';
import Database from 'better-sqlite3';

const PORT = Number(process.env.PORT || 3100);
const DB_PATH = process.env.DB_PATH || '/var/www/kebaboom/scoreboard.db';
const TOP_N = 10;
const MAX_SCORE = 10_000_000;
const MAX_INITIALS = 3;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;
const SUBMIT_MAX_PER_WINDOW = 20;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    initials TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC, id ASC);
  CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at);
`);

const insertStmt = db.prepare(
  'INSERT INTO scores (initials, score, created_at) VALUES (?, ?, ?)',
);
const topAllStmt = db.prepare(
  'SELECT id, initials, score, created_at FROM scores ORDER BY score DESC, id ASC LIMIT ?',
);
const topSinceStmt = db.prepare(
  'SELECT id, initials, score, created_at FROM scores WHERE created_at >= ? ORDER BY score DESC, id ASC LIMIT ?',
);

const ipHits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + SUBMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > SUBMIT_MAX_PER_WINDOW;
}

function tzOffsetMinutes(value) {
  const n = Number(value);
  if (Number.isFinite(n) && Math.abs(n) <= 14 * 60) return Math.round(n);
  return 0;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data.length ? JSON.parse(data) : {});
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (req.method === 'GET' && path === '/api/scores') {
    const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'today';
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || TOP_N));
    const tz = tzOffsetMinutes(url.searchParams.get('tz'));

    let entries;
    if (scope === 'all') {
      entries = topAllStmt.all(limit);
    } else {
      const nowUtc = Date.now() / 1000 + tz * 60;
      const dayStartUtc = Math.floor(nowUtc / 86400) * 86400 - tz * 60;
      entries = topSinceStmt.all(dayStartUtc, limit);
    }
    send(res, 200, { scope, entries });
    return;
  }

  if (req.method === 'POST' && path === '/api/scores') {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    if (rateLimited(ip)) {
      send(res, 429, { error: 'Too many submissions. Try again later.' });
      return;
    }

    let body;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: 'Invalid request body.' });
      return;
    }

    const initials = String(body.initials ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, MAX_INITIALS);
    const score = Math.floor(Number(body.score));
    if (initials.length < 1) {
      send(res, 400, { error: 'Initials must be 1-3 letters or digits.' });
      return;
    }
    if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) {
      send(res, 400, { error: 'Invalid score.' });
      return;
    }

    const createdAt = Math.floor(Date.now() / 1000);
    const { lastInsertRowid } = insertStmt.run(initials, score, createdAt);
    send(res, 201, { id: lastInsertRowid, initials, score, created_at: createdAt });
    return;
  }

  send(res, 404, { error: 'Not found.' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`scoreboard API listening on 127.0.0.1:${PORT} (db=${DB_PATH})`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
