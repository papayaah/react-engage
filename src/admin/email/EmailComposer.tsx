'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import type { EmailDraft, EmailIdentity } from '../../email/types';
import { EmailRequestError } from './client';

export interface EmailComposerProps {
  sender: EmailIdentity;
  ticketId?: string;
  recipient?: string;
  subject?: string;
  initialDraft?: Partial<EmailDraft>;
  onDraftChange?: (draft: EmailDraft) => void;
  onSend: (draft: EmailDraft) => Promise<{ messageId: string; ticketId: string }>;
  onSent?: (ticketId: string) => void;
}

export function EmailComposer({ sender, ticketId, recipient, subject: replySubject, initialDraft, onDraftChange, onSend, onSent }: EmailComposerProps) {
  const prefix = useId();
  const [to, setTo] = useState(initialDraft?.to || recipient || '');
  const [subject, setSubject] = useState(initialDraft?.subject || replySubject || '');
  const [message, setMessage] = useState(initialDraft?.message || '');
  const requestId = useRef(initialDraft?.requestId || '');
  const sending = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);
  const [uncertain, setUncertain] = useState(false);

  function update(next: { to?: string; subject?: string; message?: string }) {
    if (next.to !== undefined) setTo(next.to);
    if (next.subject !== undefined) setSubject(next.subject);
    if (next.message !== undefined) setMessage(next.message);
    setStatus(null);
    onDraftChange?.({ requestId: requestId.current, ticketId, to, subject, message, ...next });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || uncertain) return;
    sending.current = true;
    setIsSending(true);
    setStatus(null);
    requestId.current ||= crypto.randomUUID();
    const draft = { requestId: requestId.current, ticketId, to, subject, message };
    onDraftChange?.(draft);
    try {
      const result = await onSend(draft);
      setMessage('');
      if (!ticketId) { setTo(''); setSubject(''); }
      requestId.current = '';
      onDraftChange?.({ requestId: '', ticketId, to: ticketId ? to : '', subject: ticketId ? subject : '', message: '' });
      setStatus({ error: false, text: `Email accepted for delivery to ${to.trim()}.` });
      onSent?.(result.ticketId);
    } catch (error) {
      const outcome = error instanceof EmailRequestError ? error.outcome : 'unknown';
      if (outcome === 'failed') { requestId.current = ''; onDraftChange?.({ ...draft, requestId: '' }); }
      if (outcome === 'unknown' || outcome === 'pending') setUncertain(true);
      setStatus({ error: true, text: error instanceof Error ? error.message : 'Sending could not be confirmed. Check Sent & outbox.' });
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }

  return (
    <section className="rfw-email-composer" aria-label={ticketId ? 'Reply to conversation' : 'New email'}>
      <h3>{ticketId ? 'Reply' : 'New email'}</h3>
      <p className="rfw-email-identity">From <strong>{sender.name || sender.email}</strong> <span>{sender.email}</span></p>
      <p className="rfw-email-muted">Replies go to {sender.email}.</p>
      <form onSubmit={submit}>
        <fieldset disabled={isSending || uncertain}>
          <label htmlFor={`${prefix}-to`}>To</label>
          <input id={`${prefix}-to`} type="email" required maxLength={254} autoComplete="off" readOnly={Boolean(ticketId)}
            placeholder="recipient@example.com" value={to} onChange={event => update({ to: event.target.value })} />
          <label htmlFor={`${prefix}-subject`}>Subject</label>
          <input id={`${prefix}-subject`} required maxLength={200} readOnly={Boolean(ticketId)}
            value={subject} onChange={event => update({ subject: event.target.value })} />
          <label htmlFor={`${prefix}-message`}>Message</label>
          <textarea id={`${prefix}-message`} required maxLength={20_000} rows={ticketId ? 5 : 9}
            value={message} onChange={event => update({ message: event.target.value })} />
          <button className="rfw-email-button rfw-email-primary" type="submit" disabled={!to.trim() || !subject.trim() || !message.trim()}>
            <Send size={14} aria-hidden="true" />{isSending ? 'Sending…' : ticketId ? 'Send reply' : 'Send email'}
          </button>
        </fieldset>
        {status && <p className={`rfw-email-notice${status.error ? ' rfw-email-error' : ''}`} role={status.error ? 'alert' : 'status'}>{status.text}</p>}
        {uncertain && <p className="rfw-email-muted">This attempt is saved in Sent &amp; outbox. Check its status and the provider logs before sending another copy.</p>}
      </form>
    </section>
  );
}
