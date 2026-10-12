import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createEngageRouteHandler, createMemoryEmailStore, EmailDeliveryError, type EmailTicket } from '@reactkits.dev/react-engage/server';
import { createEmailClient } from '@reactkits.dev/react-engage/admin';

const sender = { name: 'Example Support', email: 'hello@example.app' };
const draft = { requestId: 'request_12345678', to: 'recipient@example.com', subject: 'A quick reply', message: 'Hello,\n\nThanks for your help.' };
const secret = 'test-only-inbound-secret-at-least-32-characters';
function request(action: string, body?: unknown, token?: string) {
  return new NextRequest(`http://localhost/api/engage?action=${action}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function fixture(user: { email: string; isAdmin?: boolean } | null = { email: 'personal@example.com', isAdmin: true }) {
  const store = createMemoryEmailStore();
  const send = vi.fn().mockResolvedValue({ messageId: '<accepted@provider>' });
  const routes = createEngageRouteHandler({ senderEmail: sender.email, senderName: sender.name,
    resolveRequestUser: () => user, mailbox: { store, transport: { send }, inboundSecret: secret } });
  return { ...routes, store, send };
}
const inbound = { from: draft.to, to: sender.email, subject: 'Re: A quick reply', text: 'Thanks for your message.', messageId: '<incoming@example.com>', inReplyTo: '<accepted@provider>', references: ['<accepted@provider>'] };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('reusable email helpdesk', () => {
  it.each([null, { email: 'user@example.com', isAdmin: false }])('blocks non-admin sending and mailbox access (%j)', async user => {
    const f = fixture(user);
    expect((await f.POST(request('send_email', draft))).status).toBe(403);
    expect((await f.GET(request('email_status'))).status).toBe(403);
    expect((await f.GET(request('list_email_threads&folder=inbox'))).status).toBe(403);
    expect(f.send).not.toHaveBeenCalled();
  });
  it('fails closed without an authentication resolver', async () => {
    const { POST } = createEngageRouteHandler({ mailbox: { store: createMemoryEmailStore() } });
    expect((await POST(request('send_email', draft))).status).toBe(403);
  });
  it('does not treat email actions as public feedback when no mailbox is configured', async () => {
    const { POST } = createEngageRouteHandler();
    expect((await POST(request('send_email', draft))).status).toBe(503);
  });
  it('rejects malformed JSON before contacting the provider', async () => {
    const f = fixture();
    const response = await f.POST(new NextRequest('http://localhost/api/engage?action=send_email', { method: 'POST', body: '{' }));
    expect(response.status).toBe(400); expect(f.send).not.toHaveBeenCalled();
  });
  it.each([
    null, { ...draft, requestId: '' }, { ...draft, to: 'one@example.com,two@example.com' },
    { ...draft, to: 'invalid' }, { ...draft, subject: ' ' }, { ...draft, subject: 'hello\r\nBcc: hidden@example.com' },
    { ...draft, subject: 'x'.repeat(201) }, { ...draft, message: '' }, { ...draft, message: 'x'.repeat(20_001) },
  ])('validates outgoing content before recording or sending (%#)', async body => {
    const f = fixture();
    expect((await f.POST(request('send_email', body))).status).toBe(400);
    expect(f.send).not.toHaveBeenCalled(); expect(await f.store.listThreads('sent')).toEqual([]);
  });
  it('records the send before dispatch and uses only the server sender/reply-to identity', async () => {
    const f = fixture();
    f.send.mockImplementation(async payload => {
      expect((await f.store.findMessage(`out_${draft.requestId}`))?.status).toBe('pending');
      expect(payload).toMatchObject({ sender, replyTo: sender, to: draft.to, text: draft.message });
      expect(JSON.stringify(payload)).not.toContain('personal@example.com');
      return { messageId: '<accepted@provider>' };
    });
    const response = await f.POST(request('send_email', { ...draft, sender: 'personal@example.com', replyTo: 'personal@example.com' }));
    expect(response.status).toBe(200);
    expect((await f.store.findMessage(`out_${draft.requestId}`))?.status).toBe('accepted');
    expect(await f.store.listThreads('sent')).toHaveLength(1);
  });
  it('does not dispatch the same send twice, including concurrent requests', async () => {
    const f = fixture();
    const responses = await Promise.all([f.POST(request('send_email', draft)), f.POST(request('send_email', draft))]);
    expect(responses.some(response => response.status === 200)).toBe(true);
    expect(f.send).toHaveBeenCalledTimes(1);
    expect((await f.POST(request('send_email', draft))).status).toBe(200);
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it.each(['failed', 'unknown'] as const)('keeps %s sends visible and prevents silent retries', async outcome => {
    const f = fixture(); f.send.mockRejectedValue(new EmailDeliveryError('Provider failure', outcome));
    expect((await f.POST(request('send_email', draft))).status).toBe(502);
    expect((await f.store.findMessage(`out_${draft.requestId}`))?.status).toBe(outcome);
    expect(await f.store.listThreads('sent')).toHaveLength(1);
    expect((await f.POST(request('send_email', draft))).status).toBe(409);
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it('never dispatches when reserving durable history fails', async () => {
    const f = fixture(); vi.spyOn(f.store, 'reserveMessage').mockRejectedValue(new Error('database unavailable'));
    expect((await f.POST(request('send_email', draft))).status).toBe(503);
    expect(f.send).not.toHaveBeenCalled();
  });
  it('preserves an acknowledged provider ID when history completion initially fails', async () => {
    const f = fixture();
    const original = f.store.updateDelivery.bind(f.store);
    vi.spyOn(f.store, 'updateDelivery').mockRejectedValueOnce(new Error('temporary database failure')).mockImplementation(original);
    const response = await f.POST(request('send_email', draft));
    expect((await response.json()).outcome).toBe('unknown');
    expect(await f.store.findMessage(`out_${draft.requestId}`)).toMatchObject({ status: 'unknown', providerMessageId: '<accepted@provider>' });
    expect((await f.POST(request('send_email', draft))).status).toBe(409);
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it('authenticates the inbound webhook separately from admin sessions', async () => {
    const f = fixture(null);
    expect((await f.POST(request('receive_email', inbound))).status).toBe(401);
    expect((await f.POST(request('receive_email', inbound, 'wrong-token'))).status).toBe(401);
    expect((await f.POST(request('receive_email', inbound, secret))).status).toBe(200);
    expect(await f.store.listThreads('inbox')).toHaveLength(1);
    expect(f.send).not.toHaveBeenCalled();
  });
  it('does not enable inbound mail without a configured secret', async () => {
    const { POST } = createEngageRouteHandler({ mailbox: { store: createMemoryEmailStore() } });
    expect((await POST(request('receive_email', inbound, secret))).status).toBe(503);
  });
  it.each([{ ...inbound, to: 'other@example.app' }, { ...inbound, messageId: 'invalid-id' }, { ...inbound, from: 'bad' }, { ...inbound, text: '' }])('validates incoming messages (%#)', async body => {
    const f = fixture(); expect((await f.POST(request('receive_email', body, secret))).status).toBe(400);
    expect(await f.store.listThreads('inbox')).toHaveLength(0);
  });
  it('threads a reply into the existing support ticket, reopens it, and deduplicates incoming retries', async () => {
    const f = fixture(); const sent = await (await f.POST(request('send_email', draft))).json();
    const incoming = await (await f.POST(request('receive_email', inbound, secret))).json();
    expect(incoming.ticketId).toBe(sent.ticketId);
    await f.POST(request('receive_email', inbound, secret));
    const conversation = await f.store.getConversation(sent.ticketId);
    expect(conversation?.ticket.status).toBe('open'); expect(conversation?.messages).toHaveLength(2);
    expect((await f.store.listThreads('inbox'))[0].unread).toBe(true);
    await f.POST(request('mark_email_read', { ticketId: sent.ticketId, messageIds: conversation!.messages.map(message => message.id) }));
    expect((await f.store.listThreads('inbox'))[0].unread).toBe(false);
  });
  it('does not attach another contact’s email to a referenced support ticket', async () => {
    const f = fixture(); const sent = await (await f.POST(request('send_email', draft))).json();
    const received = await (await f.POST(request('receive_email', { ...inbound, from: 'another@example.com' }, secret))).json();
    expect(received.ticketId).not.toBe(sent.ticketId);
  });
  it('uses the trusted ticket recipient and preserves reply headers when replying from the support panel', async () => {
    const f = fixture(); const sent = await (await f.POST(request('send_email', draft))).json();
    await f.POST(request('receive_email', inbound, secret));
    f.send.mockResolvedValueOnce({ messageId: '<second@provider>' });
    const response = await f.POST(request('send_reply', { ticketId: sent.ticketId, userEmail: 'wrong@example.com', replyText: 'Follow-up response', requestId: 'reply_12345678' }));
    expect(response.status).toBe(200);
    expect(f.send.mock.calls.at(-1)?.[0]).toMatchObject({ to: draft.to, inReplyTo: inbound.messageId, references: ['<accepted@provider>', inbound.messageId] });
    expect((await f.store.getConversation(sent.ticketId))?.messages).toHaveLength(3);
  });
  it('can reply to an existing web support ticket using the same email history', async () => {
    const ticket: EmailTicket = { id: 'web-ticket', subject: 'Import issue', message: 'Please help', userEmail: 'trader@example.com', status: 'open', createdAt: '2026-10-12T00:00:00Z' };
    const store = createMemoryEmailStore({ tickets: [ticket] });
    const send = vi.fn().mockResolvedValue({ messageId: '<web-reply@provider>' });
    const { POST } = createEngageRouteHandler({ senderEmail: sender.email, resolveRequestUser: () => ({ email: 'admin@example.com', isAdmin: true }), mailbox: { store, transport: { send } } });
    expect((await POST(request('send_reply', { ticketId: ticket.id, replyText: 'Here is the fix', requestId: 'web_reply_12345' }))).status).toBe(200);
    expect((await store.getConversation(ticket.id))?.ticket.status).toBe('resolved');
  });
});

describe('Brevo transport', () => {
  function routes() {
    return createEngageRouteHandler({ senderEmail: sender.email, senderName: sender.name, resolveRequestUser: () => ({ email: 'admin@example.com', isAdmin: true }), mailbox: { store: createMemoryEmailStore() } });
  }
  it('reuses the existing server API key, with no secret in client responses', async () => {
    vi.stubEnv('ENGAGE_API_KEY', 'existing-test-key');
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ messageId: '<accepted@provider>' }, { status: 201 })); vi.stubGlobal('fetch', fetchMock);
    const f = routes(); const response = await f.POST(request('send_email', draft));
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][1].headers['api-key']).toBe('existing-test-key');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ sender, replyTo: sender, textContent: draft.message });
    expect(JSON.stringify(await (await f.GET(request('email_status'))).json())).not.toContain('existing-test-key');
  });
  it('reports missing credentials instead of pretending to send', async () => {
    vi.stubEnv('ENGAGE_API_KEY', ''); vi.stubEnv('BREVO_API_KEY', '');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect((await routes().POST(request('send_email', draft))).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 429, 500])('reports provider rejection %i without exposing provider details', async status => {
    vi.stubEnv('ENGAGE_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'sensitive provider detail' }, { status })));
    const response = await routes().POST(request('send_email', draft));
    expect(response.status).toBe(status === 429 ? 429 : 502);
    const result = await response.json(); expect(result.outcome).toBe('failed'); expect(JSON.stringify(result)).not.toContain('sensitive provider detail');
  });
  it.each([() => Promise.reject(new Error('network')), () => Promise.resolve(Response.json({})), () => Promise.resolve(new Response('not JSON'))])('records uncertain delivery without automatic retries (%#)', async implementation => {
    vi.stubEnv('ENGAGE_API_KEY', 'test-key'); const fetchMock = vi.fn().mockImplementation(implementation); vi.stubGlobal('fetch', fetchMock);
    const response = await routes().POST(request('send_email', draft));
    expect((await response.json()).outcome).toBe('unknown'); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('portable React email client', () => {
  it('uses the host endpoint and surfaces failures instead of returning success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: 'Quota exceeded', outcome: 'failed' }, { status: 429 })); vi.stubGlobal('fetch', fetchMock);
    await expect(createEmailClient('/custom/helpdesk?app=other').send(draft)).rejects.toMatchObject({ message: 'Quota exceeded', outcome: 'failed' });
    expect(fetchMock.mock.calls[0][0]).toBe('/custom/helpdesk?app=other&action=send_email');
  });
});
