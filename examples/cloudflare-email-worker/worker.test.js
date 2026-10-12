import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
function fixture(mime) {
  const values = new Map(); const forwards = [];
  const env = { MAILBOX_ADDRESS: 'hello@example.app', FORWARD_TO: 'backup@example.net',
    ENGAGE_ENDPOINT: 'https://example.app/api/engage', ENGAGE_INBOUND_SECRET: 'worker-test-secret',
    INBOUND_RETRY: {
      async put(key, value) { values.set(key, value); }, async delete(key) { values.delete(key); },
      async get(key, type) { const value = values.get(key); return type === 'json' && value ? JSON.parse(value) : value; },
      async list({ prefix }) { return { keys: [...values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })) }; },
    } };
  const bytes = new TextEncoder().encode(mime);
  const message = { to: env.MAILBOX_ADDRESS, from: 'customer@example.com', raw: new Blob([bytes]).stream(), rawSize: bytes.length,
    async forward(address) { forwards.push(address); }, setReject() { throw new Error('Unexpected rejection'); } };
  return { env, values, forwards, message };
}
const htmlMail = 'From: Customer <customer@example.com>\r\nTo: hello@example.app\r\nSubject: Hello\r\nMessage-ID: <hello@example.com>\r\nIn-Reply-To: <parent@example.app>\r\nReferences: <parent@example.app>\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>Hello <strong>support</strong>.</p>';
test('parses HTML-only MIME and reserves retry storage before HTTP', async () => {
  const f = fixture(htmlMail); const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(f.values.size, 1); assert.match(url.href, /action=receive_email/);
    assert.equal(options.headers.authorization, 'Bearer worker-test-secret');
    const body = JSON.parse(options.body);
    assert.equal(body.messageId, '<hello@example.com>'); assert.equal(body.from, 'customer@example.com');
    assert.equal(body.inReplyTo, '<parent@example.app>'); assert.deepEqual(body.references, ['<parent@example.app>']);
    assert.match(body.text, /Hello support/); assert.doesNotMatch(body.text, /<strong>/);
    return Response.json({ success: true });
  };
  try { await worker.email(f.message, f.env); assert.equal(f.values.size, 0); assert.deepEqual(f.forwards, ['backup@example.net']); }
  finally { globalThis.fetch = original; }
});
test('retains failures and removes them after scheduled acknowledgement', async () => {
  const f = fixture(htmlMail); const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 503 });
  try {
    await worker.email(f.message, f.env); assert.equal(f.values.size, 1);
    globalThis.fetch = async () => Response.json({ success: true, duplicate: true });
    await worker.scheduled({}, f.env); assert.equal(f.values.size, 0);
  } finally { globalThis.fetch = original; }
});
test('retains rejected payloads separately without blocking retries', async () => {
  const f = fixture(htmlMail); const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 400 });
  try { await worker.email(f.message, f.env); assert.equal(f.values.size, 1); assert.match([...f.values.keys()][0], /^rejected:email:/); }
  finally { globalThis.fetch = original; }
});
test('assigns stable IDs to messages missing a Message-ID', async () => {
  const raw = htmlMail.replace('Message-ID: <hello@example.com>\r\n', '');
  const first = fixture(raw); const second = fixture(raw); const ids = []; const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => { ids.push(JSON.parse(options.body).messageId); return Response.json({ success: true }); };
  try { await worker.email(first.message, first.env); await worker.email(second.message, second.env); assert.equal(ids[0], ids[1]); assert.match(ids[0], /@engage-inbound>/); }
  finally { globalThis.fetch = original; }
});
