export interface EmailIdentity { email: string; name?: string }
export type EmailDeliveryStatus = 'pending' | 'accepted' | 'failed' | 'unknown' | 'received';
export interface EmailAttachment { name: string; contentType: string; size: number }
export interface EmailMessage {
  id: string;
  ticketId: string;
  direction: 'incoming' | 'outgoing';
  status: EmailDeliveryStatus;
  from: string;
  to: string;
  subject: string;
  text: string;
  createdAt: string;
  providerMessageId?: string;
  inReplyTo?: string;
  references: string[];
  attachments: EmailAttachment[];
  error?: string;
  readAt?: string;
}
export interface EmailTicket {
  id: string;
  subject: string;
  message: string;
  userEmail: string;
  userName?: string;
  category?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
}
export interface EmailConversation { ticket: EmailTicket; messages: EmailMessage[] }
export interface EmailThread {
  id: string;
  subject: string;
  contactEmail: string;
  contactName?: string;
  preview: string;
  updatedAt: string;
  unread: boolean;
  status: EmailTicket['status'];
}
export interface EmailDraft {
  requestId: string;
  to?: string;
  subject?: string;
  message: string;
  ticketId?: string;
}
/** Hosts own persistence. All writes must be durable before provider dispatch. */
export interface EmailStore {
  listThreads(folder: 'inbox' | 'sent'): Promise<EmailThread[]>;
  getConversation(ticketId: string): Promise<EmailConversation | null>;
  findMessage(id: string): Promise<EmailMessage | null>;
  findByProviderId(messageId: string): Promise<EmailMessage | null>;
  /** Atomically create the ticket if needed and insert the message. False means duplicate. */
  reserveMessage(ticket: EmailTicket, message: EmailMessage): Promise<boolean>;
  updateDelivery(id: string, status: EmailDeliveryStatus, fields?: { providerMessageId?: string; error?: string }): Promise<void>;
  markRead(ticketId: string, messageIds: string[]): Promise<void>;
}
export interface EmailSendRequest {
  sender: EmailIdentity;
  replyTo: EmailIdentity;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references: string[];
}
export interface EmailTransport { send(message: EmailSendRequest): Promise<{ messageId: string }> }
export interface EmailMailboxConfig {
  store: EmailStore;
  /** Optional provider override. Defaults to Brevo using the Engage server API key. */
  transport?: EmailTransport;
  /** Secret shared with the inbound adapter; never expose it in React props. */
  inboundSecret?: string;
}
