import type { EmailStore, EmailTicket, EmailMessage } from '../../email/types';

/** Isolated demos/tests only. Production hosts should provide a database-backed store. */
export function createMemoryEmailStore(seed: { tickets?: EmailTicket[]; messages?: EmailMessage[] } = {}): EmailStore {
  const tickets = new Map((seed.tickets || []).map(ticket => [ticket.id, structuredClone(ticket)]));
  const messages = new Map((seed.messages || []).map(message => [message.id, structuredClone(message)]));
  return {
    async listThreads(folder) {
      const direction = folder === 'inbox' ? 'incoming' : 'outgoing';
      return [...tickets.values()].flatMap(ticket => {
        const items = [...messages.values()].filter(message => message.ticketId === ticket.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        if (!items.some(message => message.direction === direction)) return [];
        const last = items[items.length - 1];
        return [{ id: ticket.id, subject: ticket.subject, contactEmail: ticket.userEmail,
          contactName: ticket.userName, status: ticket.status, preview: last.text.slice(0, 160),
          updatedAt: last.createdAt, unread: items.some(message => message.direction === 'incoming' && !message.readAt) }];
      }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getConversation(id) {
      const ticket = tickets.get(id);
      if (!ticket) return null;
      return structuredClone({ ticket, messages: [...messages.values()].filter(message => message.ticketId === id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)) });
    },
    async findMessage(id) { return structuredClone(messages.get(id) || null); },
    async findByProviderId(id) { return structuredClone([...messages.values()].find(message => message.providerMessageId === id) || null); },
    async reserveMessage(ticket, message) {
      if (messages.has(message.id) || (message.providerMessageId && [...messages.values()].some(item => item.providerMessageId === message.providerMessageId))) return false;
      if (!tickets.has(ticket.id)) tickets.set(ticket.id, structuredClone(ticket));
      if (message.direction === 'incoming') tickets.get(ticket.id)!.status = 'open';
      messages.set(message.id, structuredClone(message));
      return true;
    },
    async updateDelivery(id, status, fields = {}) {
      const message = messages.get(id);
      if (!message) throw new Error('Email message does not exist');
      Object.assign(message, { status, ...fields });
      if (status === 'accepted') tickets.get(message.ticketId)!.status = 'resolved';
    },
    async markRead(ticketId, ids) {
      for (const id of ids) {
        const message = messages.get(id);
        if (message?.ticketId === ticketId && message.direction === 'incoming') message.readAt = new Date().toISOString();
      }
    },
  };
}
