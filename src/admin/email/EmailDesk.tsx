'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Inbox, Mail, RefreshCw, Send } from 'lucide-react';
import type { EmailConversation, EmailDraft, EmailIdentity, EmailThread, EmailTicket } from '../../email/types';
import { createEmailClient, type EmailClient } from './client';
import { EmailComposer } from './EmailComposer';

export interface EmailDeskProps {
  apiEndpoint?: string;
  /** Supply a client to mount in a React app with a custom backend. */
  client?: EmailClient;
  theme?: 'inherit' | 'light' | 'dark' | 'system';
  initialTicketId?: string;
  onOpenTicket?: (ticket: EmailTicket) => void;
  onChanged?: () => void;
}
const statusLabels = { pending: 'Sending', accepted: 'Accepted for delivery', failed: 'Failed', unknown: 'Unconfirmed', received: 'Received' };

export function EmailDesk({ apiEndpoint = '/api/engage', client: customClient, theme = 'inherit', initialTicketId, onOpenTicket, onChanged }: EmailDeskProps) {
  const client = useMemo(() => customClient || createEmailClient(apiEndpoint), [customClient, apiEndpoint]);
  const [view, setView] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [conversation, setConversation] = useState<EmailConversation | null>(null);
  const [sender, setSender] = useState<EmailIdentity | null>(null);
  const [inboundEnabled, setInboundEnabled] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [opening, setOpening] = useState(false);
  const openSequence = useRef(0);
  const drafts = useRef(new Map<string, EmailDraft>());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([client.status(), client.listThreads(folder)]).then(([status, items]) => {
      if (cancelled) return;
      setSender(status.sender); setInboundEnabled(status.inboundEnabled); setThreads(items);
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load email.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client, folder, revision]);

  const open = useCallback(async (id: string) => {
    const sequence = ++openSequence.current;
    setOpening(true);
    setError('');
    try {
      const item = await client.getConversation(id);
      if (sequence !== openSequence.current) return;
      setConversation(item);
      setView(current => current === 'compose' ? 'inbox' : current);
      await client.markRead(id, item.messages.filter(message => message.direction === 'incoming').map(message => message.id));
      if (sequence === openSequence.current) setThreads(current => current.map(thread => thread.id === id ? { ...thread, unread: false } : thread));
    } catch (cause) {
      if (sequence === openSequence.current) setError(cause instanceof Error ? cause.message : 'Unable to open conversation.');
    } finally { if (sequence === openSequence.current) setOpening(false); }
  }, [client]);

  useEffect(() => { if (initialTicketId) void open(initialTicketId); }, [initialTicketId, open]);

  function chooseView(next: 'inbox' | 'sent' | 'compose') {
    ++openSequence.current;
    setOpening(false);
    setView(next);
    if (next !== 'compose') {
      if (next !== folder) setConversation(null);
      setFolder(next);
    }
  }
  function changed(id: string) {
    setRevision(value => value + 1);
    onChanged?.();
    if (conversation?.ticket.id === id) void open(id);
  }
  const visible = threads.filter(thread => `${thread.contactEmail} ${thread.contactName || ''} ${thread.subject} ${thread.preview}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="rfw-root rfw-email-desk" data-theme={theme} aria-label="Email helpdesk">
      <div className="rfw-email-toolbar">
        <nav aria-label="Email folders">
          {([['inbox', 'Inbox', Inbox], ['sent', 'Sent & outbox', Send], ['compose', 'Compose', Mail]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" className="rfw-email-button" aria-pressed={view === id} onClick={() => chooseView(id)}>
              <Icon size={14} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
        <button className="rfw-email-button" type="button" disabled={loading} onClick={() => {
          setRevision(value => value + 1); if (conversation) void open(conversation.ticket.id);
        }} aria-label="Refresh email"><RefreshCw size={14} aria-hidden="true" /></button>
      </div>
      {error && <p role="alert" className="rfw-email-notice rfw-email-error">{error}</p>}
      {!inboundEnabled && !loading && !error && <p className="rfw-email-notice">Incoming email is not connected yet. Your administrator can connect an inbound email adapter.</p>}
      <div hidden={view !== 'compose'}>
        {sender ? <EmailComposer sender={sender} onSend={draft => client.send(draft)} onSent={changed} /> : <p className="rfw-email-empty">{loading ? 'Loading sender…' : 'Connect the email backend to compose messages.'}</p>}
      </div>
      <div className={`rfw-email-columns${conversation ? ' rfw-email-has-conversation' : ''}`} hidden={view === 'compose'}>
        <aside className="rfw-email-list" aria-label="Email conversations">
          <input aria-label="Search email" placeholder="Search email…" value={search} onChange={event => setSearch(event.target.value)} />
          {loading ? <p className="rfw-email-empty">Loading email…</p> : visible.length === 0 ? <p className="rfw-email-empty">{search ? 'No matching conversations.' : folder === 'inbox' ? 'No incoming email yet.' : 'No outgoing email yet.'}</p> : visible.map(thread => (
            <button className="rfw-email-thread" key={thread.id} type="button" aria-current={conversation?.ticket.id === thread.id ? 'true' : undefined} onClick={() => void open(thread.id)}>
              <span className="rfw-email-thread-contact">{thread.unread && <span aria-label="Unread" className="rfw-email-unread" />}{thread.contactName || thread.contactEmail}</span>
              <strong>{thread.subject}</strong><span className="rfw-email-preview">{thread.preview}</span>
              <time className="rfw-email-muted">{new Date(thread.updatedAt).toLocaleString()}</time>
            </button>
          ))}
        </aside>
        <div className="rfw-email-conversation" aria-busy={opening}>
          {opening ? <p className="rfw-email-empty">Opening conversation…</p> : conversation ? <>
            <header className="rfw-email-conversation-header">
              <button className="rfw-email-button" type="button" onClick={() => { openSequence.current++; setConversation(null); }}><ArrowLeft size={14} />Back to list</button>
              <h3>{conversation.ticket.subject}</h3><p className="rfw-email-muted">{conversation.ticket.userEmail}</p>
              {onOpenTicket && <button className="rfw-email-button" type="button" onClick={() => onOpenTicket(conversation.ticket)}>Open support ticket</button>}
            </header>
            {conversation.ticket.category !== 'EMAIL' && <article className="rfw-email-message"><strong>Original support request</strong><p>{conversation.ticket.message}</p></article>}
            {conversation.messages.map(message => <article className="rfw-email-message" key={message.id} data-direction={message.direction}>
              <div className="rfw-email-message-meta"><strong>{message.from}</strong><span>{statusLabels[message.status]}</span></div>
              <p className="rfw-email-muted">To {message.to} · {new Date(message.createdAt).toLocaleString()}</p>
              <p className="rfw-email-body">{message.text}</p>
              {message.error && <p className="rfw-email-error">{message.error}</p>}
              {message.attachments.length > 0 && <p className="rfw-email-muted">Attachments: {message.attachments.map(item => item.name || 'Unnamed attachment').join(', ')}. Open your forwarded copy for attachment files.</p>}
            </article>)}
            {sender && <EmailComposer key={conversation.ticket.id} sender={sender} ticketId={conversation.ticket.id} recipient={conversation.ticket.userEmail}
              subject={(/^re:/i.test(conversation.ticket.subject) ? conversation.ticket.subject : `Re: ${conversation.ticket.subject}`).slice(0, 200)}
              initialDraft={drafts.current.get(conversation.ticket.id)} onDraftChange={draft => drafts.current.set(conversation.ticket.id, draft)}
              onSend={draft => client.send(draft)} onSent={changed} />}
          </> : <p className="rfw-email-empty">Select a conversation to read and reply, or compose a new email.</p>}
        </div>
      </div>
    </section>
  );
}
