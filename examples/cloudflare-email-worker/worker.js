import PostalMime from 'postal-mime';
import { convert } from 'html-to-text';

async function submit(env, key, payload) {
  const endpoint = new URL(env.ENGAGE_ENDPOINT);
  if (endpoint.protocol !== 'https:') throw new Error('The Engage inbound endpoint must use HTTPS.');
  endpoint.searchParams.set('action', 'receive_email');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.ENGAGE_INBOUND_SECRET}` },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
  });
  if (response.status === 400) {
    // Preserve malformed/rejected payloads for review without starving the retry queue.
    await env.INBOUND_RETRY.put(`rejected:${key}`, JSON.stringify(payload));
    await env.INBOUND_RETRY.delete(key);
    return;
  }
  if (!response.ok) throw new Error(`Engage ingestion failed (${response.status}).`);
  const result = await response.json();
  if (!result.success) throw new Error('Engage did not acknowledge ingestion.');
  await env.INBOUND_RETRY.delete(key);
}

export default {
  async email(message, env) {
    if (message.to.toLowerCase() !== env.MAILBOX_ADDRESS.toLowerCase()) {
      message.setReject('This mailbox is not configured.');
      return;
    }
    // Keep a mailbox copy with all attachments, including while the app is unavailable.
    if (env.FORWARD_TO) await message.forward(env.FORWARD_TO);
    if (!env.INBOUND_RETRY || !env.ENGAGE_INBOUND_SECRET) throw new Error('Configure the retry store and shared inbound secret.');
    if (message.rawSize > 10 * 1024 * 1024) throw new Error('Email exceeds the 10 MiB processing limit; use the forwarded copy.');
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);
    const digest = await crypto.subtle.digest('SHA-256', raw);
    const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const messageId = /^<[^\s<>]{1,500}>$/.test(parsed.messageId || '') ? parsed.messageId : `<${hash}@engage-inbound>`;
    const header = name => parsed.headers.find(item => item.key.toLowerCase() === name)?.value || '';
    const ids = value => value.match(/<[^\s<>]+>/g) || [];
    const text = parsed.text?.trim() || (parsed.html ? convert(parsed.html, { wordwrap: false }).trim() : '') || '[Email has no text body]';
    const payload = {
      messageId, from: parsed.from?.address || message.from, fromName: parsed.from?.name || '', to: message.to,
      subject: (parsed.subject || '(No subject)').replace(/[\r\n]/g, ' ').slice(0, 196),
      text: text.length > 100000 ? `${text.slice(0, 99900)}\n[Message truncated; see forwarded copy.]` : text,
      inReplyTo: ids(header('in-reply-to'))[0], references: ids(header('references')).slice(-30),
      attachments: (parsed.attachments || []).map(item => ({ name: item.filename || 'Unnamed attachment', contentType: item.mimeType, size: item.content.byteLength })),
    };
    const key = `email:${hash}`;
    // Durable retry precedes HTTP ingestion. Message-ID deduplication makes retries safe.
    await env.INBOUND_RETRY.put(key, JSON.stringify(payload));
    try { await submit(env, key, payload); }
    catch { console.error('Engage ingestion deferred; the message is retained for scheduled retry.'); }
  },
  async scheduled(_event, env) {
    const page = await env.INBOUND_RETRY.list({ prefix: 'email:', limit: 50 });
    for (const item of page.keys) {
      const payload = await env.INBOUND_RETRY.get(item.name, 'json');
      if (!payload) continue;
      try { await submit(env, item.name, payload); }
      catch { console.error('Engage retry deferred; the message remains in the retry store.'); }
    }
  },
};
