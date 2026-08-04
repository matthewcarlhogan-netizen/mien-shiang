import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// --- adjust these two to match your repo ---------------------------------
const SERVER_ENTRY = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'serve.js');
const PORT = 8123;
// -------------------------------------------------------------------------

let child;

/**
 * Sends a request line verbatim. fetch(), curl without --path-as-is, and
 * PowerShell all normalise "/../" before it reaches the wire, which means a
 * traversal test built on them proves nothing. A raw socket does not.
 */
function rawRequest(rawPath) {
  return new Promise((resolve, reject) => {
    const sock = connect(PORT, '127.0.0.1');
    let buf = '';
    sock.setTimeout(5000, () => { sock.destroy(); reject(new Error('timeout')); });
    sock.on('connect', () => {
      sock.write(`GET ${rawPath} HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nConnection: close\r\n\r\n`);
    });
    sock.on('data', (d) => { buf += d.toString('latin1'); });
    sock.on('error', reject);
    sock.on('close', () => {
      const status = Number(buf.slice(0, buf.indexOf('\r\n')).split(' ')[1]);
      const body = buf.slice(buf.indexOf('\r\n\r\n') + 4);
      resolve({ status, body });
    });
  });
}

function waitForPort(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function attempt() {
      const s = connect(PORT, '127.0.0.1');
      s.on('connect', () => { s.end(); resolve(); });
      s.on('error', () => {
        s.destroy();
        if (Date.now() > deadline) reject(new Error('server did not start'));
        else setTimeout(attempt, 100);
      });
    })();
  });
}

before(async () => {
  child = spawn(process.execPath, [SERVER_ENTRY], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await waitForPort();
});

after(() => { child?.kill(); });

// POSITIVE CONTROL — must come first conceptually.
// Without this, a server that returns 403 for *every* request passes the
// entire traversal suite. That is exactly how the earlier "verified 404 on
// /../package.json" result was green while the app was completely unservable.
test('serves a real file (control: proves the server is actually working)', async () => {
  const res = await rawRequest('/index.html');
  assert.equal(res.status, 200, 'server is not serving real files; traversal results below are meaningless');
  // Anchored on the <title>, not the mock repo's /ok/. That pattern did match
  // this index.html, but only by landing inside the word "look" in a CSS
  // comment — it would have passed for the wrong reason and broken on a reword.
  assert.match(res.body, /<title>Mien Shiang<\/title>/);
});

test('serves the app root', async () => {
  const res = await rawRequest('/');
  assert.equal(res.status, 200);
});

const escapes = [
  '/../package.json',
  '/..\\package.json',
  '/....//package.json',
  '/src/../../package.json',
  '/%2e%2e/package.json',
  '/%2e%2e%2fpackage.json',
  '/..%2fpackage.json',
  '/%2e%2e%5cpackage.json',
  '/../package.json.secretmarker',
];

for (const path of escapes) {
  test(`refuses traversal: ${path}`, async () => {
    const res = await rawRequest(path);
    assert.equal(res.status, 404, `expected 404, got ${res.status}`);
    assert.doesNotMatch(res.body, /SECRET|"name":/, 'leaked file contents');
  });
}

// Sibling-directory escape: startsWith(ROOT) without a trailing separator
// lets "<root>-old" or "<root>.bak" through.
test('refuses sibling-directory escape', async () => {
  const res = await rawRequest('/../src-old/index.html');
  assert.equal(res.status, 404);
});
