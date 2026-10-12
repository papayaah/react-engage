import type { EmailConversation, EmailDraft, EmailIdentity, EmailThread } from '../../email/types';

export interface EmailClient {
  status(): Promise<{ sender: EmailIdentity; inboundEnabled: boolean }>;
  listThreads(folder: 'inbox' | 'sent'): Promise<EmailThread[]>;
  getConversation(ticketId: string): Promise<EmailConversation>;
  markRead(ticketId: string, messageIds: string[]): Promise<void>;
  send(draft: EmailDraft): Promise<{ messageId: string; ticketId: string }>;
}
export class EmailRequestError extends Error {
  constructor(message: string, public readonly outcome?: string) { super(message); }
}

/** Replace this client to use GraphQL, your own HTTP routes, or another backend. */
export function createEmailClient(endpoint: string): EmailClient {
  async function request(action: string, params: Record<string, string> = {}, body?: unknown) {
    const query = new URLSearchParams({ action, ...params });
    const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`, body === undefined ? undefined : {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new EmailRequestError(
      result?.error || 'The email request could not be confirmed. Refresh the mailbox before trying again.', result?.outcome);
    return result;
  }
  return {
    status: () => request('email_status'),
    async listThreads(folder) { return (await request('list_email_threads', { folder })).threads; },
    async getConversation(ticketId) { return (await request('get_email_thread', { ticketId })).conversation; },
    async markRead(ticketId, messageIds) { await request('mark_email_read', {}, { ticketId, messageIds }); },
    async send(draft) {
      const result = await request('send_email', {}, draft);
      if (!result.success || !result.messageId) throw new EmailRequestError('Sending could not be confirmed. Check Sent & outbox before resending.', 'unknown');
      return result;
    },
  };
}
