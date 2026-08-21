import React, { useState } from 'react';
import { TicketPayload, WidgetUser, EngageWidgetContent } from '../../types';
import { AlertCircle, LifeBuoy } from 'lucide-react';
import { DEFAULT_ENGAGE_CONTENT } from '../../content';

interface TicketTabProps {
  appId: string;
  user?: WidgetUser;
  onSubmit: (payload: TicketPayload) => Promise<void> | void;
  content?: EngageWidgetContent['feedback'];
}

export const TicketTab: React.FC<TicketTabProps> = ({ appId, user, onSubmit, content = DEFAULT_ENGAGE_CONTENT.feedback }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setErrorMsg(content.validation.missingSupportMessage);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload: TicketPayload = {
        appId,
        subject,
        message,
        user: {
          ...user,
          email: email || user?.email,
        },
        timestamp: new Date().toISOString(),
      };

      await onSubmit(payload);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : content.errors.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rfw-success-box">
        <div className="rfw-success-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
          <LifeBuoy size={28} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>{content.success.supportTitle}</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          {content.success.supportMessage}
        </p>
        <button
          className="rfw-btn-submit"
          style={{ width: 'auto', padding: '8px 20px', marginTop: 12 }}
          onClick={() => {
            setIsSubmitted(false);
            setSubject('');
            setMessage('');
          }}
        >
          {content.success.submitMoreButton}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {errorMsg && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--rfw-loss)',
            borderRadius: 8,
            color: 'var(--rfw-loss)',
            fontSize: 13,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="rfw-field">
        <label className="rfw-label">{content.summaryLabels.support}</label>
        <input
          type="text"
          className="rfw-input"
          placeholder={content.summaryPlaceholders.support}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.emailLabels.required}</label>
        <input
          type="email"
          className="rfw-input"
          placeholder={content.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.messageLabels.support}</label>
        <textarea
          className="rfw-textarea"
          placeholder={content.messagePlaceholders.support}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting ? content.submitButtons.submitting : content.submitButtons.support}
      </button>
    </form>
  );
};
