import { createHash, timingSafeEqual } from 'node:crypto';
import type { EmailIdentity, EmailMailboxConfig, EmailMessage, EmailTicket } from '../../email/types';
import { createBrevoEmailTransport, EmailDeliveryError } from './transport';

const EMAIL = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const REQUEST_ID = /^[a-zA-Z0-9_-]{8,100}$/;
const MESSAGE_ID = /^<[^\s<>]{1,500}>$/;
export const EMAIL_ACTIONS = new Set(['email_status', 'list_email_threads', 'get_email_thread', 'send_email', 'receive_email', 'mark_email_read']);

const json = (body: unknown, status = 200) => Response.json(body, { status });
const str = (value: unknown) => typeof value === 'string' ? value.trim() : '';
function requireAddress(value: unknown) {
  const address = str(value).toLowerCase();
  if (address.length > 254 || !EMAIL.test(address)) throw new Error('Enter one valid email address.');
  return address;
}
function messageIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && MESSAGE_ID.test(id)))].slice(-30) : [];
}

interface EmailHandlerConfig extends EmailMailboxConfig {
  sender: EmailIdentity;
  getApiKey: () => string | undefined;
  authorize: (request: Request) => boolean | Promise<boolean>;
}

/** Standard Request/Response API; React hosts can use it with any Node HTTP framework. */
export function createEngageEmailHandler(config: EmailHandlerConfig) {
  const { store } = config;
  const transport = config.transport || createBrevoEmailTransport(config.getApiKey);

  async function send(input: Record<string, unknown>, supportReply: boolean) {
    const requestId = str(input.requestId);
    if (!REQUEST_ID.test(requestId)) return json({ error: 'A unique send request ID is required.' }, 400);
    const id = `out_${requestId}`;
    const previous = await store.findMessage(id);
    if (previous) {
      if (previous.status === 'accepted') return json({ success: true, messageId: previous.providerMessageId, ticketId: previous.ticketId });
      return json({ error: 'This send attempt is already recorded. Check Sent & outbox before creating another attempt.', outcome: previous.status }, 409);
    }

    let text: string;
    let subject: string;
    let to: string;
    let ticket: EmailTicket;
    let references: string[] = [];
    let inReplyTo: string | undefined;
    try {
      text = str(supportReply ? input.replyText : input.message);
      if (!text || text.length > 20_000) throw new Error('Enter a message of up to 20,000 characters.');
      requireAddress(config.sender.email);
      const ticketId = str(input.ticketId);
      if (ticketId) {
        const conversation = await store.getConversation(ticketId);
        if (!conversation) return json({ error: 'This conversation could not be found.' }, 404);
        ticket = conversation.ticket;
        to = requireAddress(ticket.userEmail);
        subject = (/^re:/i.test(ticket.subject) ? ticket.subject : `Re: ${ticket.subject}`).slice(0, 200);
        const latest = [...conversation.messages].reverse().find(message => message.providerMessageId);
        inReplyTo = latest?.providerMessageId;
        references = messageIds([...(latest?.references || []), latest?.providerMessageId]);
      } else {
        if (supportReply) throw new Error('A ticket is required to send a support reply.');
        to = requireAddress(input.to);
        subject = str(input.subject);
        ticket = { id: `email_${requestId}`, subject, message: text, userEmail: to,
          category: 'EMAIL', status: 'open', createdAt: new Date().toISOString() };
      }
      if (!subject || subject.length > 200 || /[\r\n]/.test(subject)) throw new Error('Enter a subject of up to 200 characters on one line.');
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Invalid email.' }, 400);
    }

    const message: EmailMessage = {
      id, ticketId: ticket.id, direction: 'outgoing', status: 'pending', from: config.sender.email,
      to, subject, text, createdAt: new Date().toISOString(), references, inReplyTo, attachments: [],
    };
    if (!await store.reserveMessage(ticket, message)) {
      return json({ error: 'This send attempt is already being processed. Check Sent & outbox.', outcome: 'pending' }, 409);
    }
    let acknowledgedId: string | undefined;
    try {
      const result = await transport.send({ sender: config.sender, replyTo: config.sender, to, subject, text, inReplyTo, references });
      acknowledgedId = result.messageId;
      await store.updateDelivery(id, 'accepted', { providerMessageId: result.messageId });
      return json({ success: true, messageId: result.messageId, ticketId: ticket.id, status: 'resolved' });
    } catch (error) {
      const failure = error instanceof EmailDeliveryError ? error
        : new EmailDeliveryError('Sending could not be confirmed. Check the provider’s email logs before resending.', 'unknown');
      await store.updateDelivery(id, failure.outcome, { error: failure.message, ...(acknowledgedId ? { providerMessageId: acknowledgedId } : {}) });
      return json({ error: failure.message, outcome: failure.outcome, ticketId: ticket.id }, failure.status);
    }
  }

  async function receive(input: Record<string, unknown>) {
    let from: string;
    let to: string;
    const providerMessageId = str(input.messageId);
    const text = str(input.text);
    const subject = str(input.subject) || '(No subject)';
    try {
      from = requireAddress(input.from);
      to = requireAddress(input.to);
      if (to !== config.sender.email.toLowerCase()) throw new Error('This recipient is not configured for this mailbox.');
      if (!MESSAGE_ID.test(providerMessageId)) throw new Error('A valid inbound Message-ID is required.');
      if (subject.length > 200 || /[\r\n]/.test(subject)) throw new Error('Invalid inbound subject.');
      if (!text || text.length > 100_000) throw new Error('Inbound text must contain 1–100,000 characters.');
    } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid inbound email.' }, 400); }

    const existing = await store.findByProviderId(providerMessageId);
    if (existing) return json({ success: true, duplicate: true, ticketId: existing.ticketId });
    const references = messageIds(input.references);
    const inReplyTo = messageIds([input.inReplyTo])[0];
    let ticket: EmailTicket | undefined;
    for (const reference of [...new Set([inReplyTo, ...references].filter((id): id is string => Boolean(id)))].reverse()) {
      const parent = await store.findByProviderId(reference);
      const conversation = parent ? await store.getConversation(parent.ticketId) : null;
      if (conversation?.ticket.userEmail.toLowerCase() === from) { ticket = conversation.ticket; break; }
    }
    const id = `in_${createHash('sha256').update(providerMessageId).digest('hex')}`;
    ticket ||= { id: `email_${id}`, subject, message: text, userEmail: from,
      userName: str(input.fromName).slice(0, 200), category: 'EMAIL', status: 'open', createdAt: new Date().toISOString() };
    const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0, 30).flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      return [{ name: str(item.name).slice(0, 255), contentType: str(item.contentType).slice(0, 100),
        size: typeof item.size === 'number' && Number.isFinite(item.size) && item.size >= 0 ? item.size : 0 }];
    }) : [];
    const inserted = await store.reserveMessage(ticket, { id, ticketId: ticket.id, direction: 'incoming', status: 'received',
      from, to, subject, text, createdAt: new Date().toISOString(), providerMessageId, inReplyTo, references, attachments });
    return json({ success: true, duplicate: !inserted, ticketId: ticket.id });
  }

  return {
    async handle(request: Request, action: string): Promise<Response> {
      try {
        if (action === 'receive_email') {
          if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
          const secret = config.inboundSecret;
          if (!secret || secret.length < 32) return json({ error: 'Incoming email is not configured.' }, 503);
          const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
          const hash = (value: string) => createHash('sha256').update(value).digest();
          if (!timingSafeEqual(hash(secret), hash(supplied))) return json({ error: 'Unauthorized' }, 401);
        } else if (!await config.authorize(request)) {
          return json({ error: 'Sign in with an admin account to manage email.' }, 403);
        }
        if (request.method === 'GET') {
          const params = new URL(request.url).searchParams;
          if (action === 'email_status') return json({ sender: config.sender, inboundEnabled: Boolean(config.inboundSecret && config.inboundSecret.length >= 32) });
          if (action === 'list_email_threads') {
            const folder = params.get('folder');
            if (folder !== 'inbox' && folder !== 'sent') return json({ error: 'Invalid folder.' }, 400);
            return json({ threads: await store.listThreads(folder) });
          }
          if (action === 'get_email_thread') {
            const conversation = await store.getConversation(params.get('ticketId') || '');
            if (!conversation) return json({ error: 'Conversation not found.' }, 404);
            return json({ conversation });
          }
        }
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        let input: Record<string, unknown>;
        try {
          const body: unknown = await request.json();
          if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
          input = body as Record<string, unknown>;
        } catch { return json({ error: 'Invalid email request.' }, 400); }
        if (action === 'receive_email') return await receive(input);
        if (action === 'send_email' || action === 'send_reply') return await send(input, action === 'send_reply');
        if (action === 'mark_email_read') {
          const ids = Array.isArray(input.messageIds) ? input.messageIds.filter((id): id is string => typeof id === 'string').slice(0, 500) : [];
          await store.markRead(str(input.ticketId), ids);
          return json({ success: true });
        }
        return json({ error: 'Unknown email action.' }, 400);
      } catch {
        return json({ error: 'Email storage is unavailable. Refresh the mailbox before attempting to send again.' }, 503);
      }
    },
  };
}
