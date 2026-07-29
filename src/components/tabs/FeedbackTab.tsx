import React, { useState } from 'react';
import { WidgetUser, Attachment } from '../../types';
import { AlertCircle, Paperclip, X, CheckCircle2 } from 'lucide-react';

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'support';

export interface FeedbackPayload {
  appId: string;
  category: FeedbackCategory;
  message: string;
  email?: string;
  user?: WidgetUser;
  attachments?: Attachment[];
  timestamp: string;
}

interface FeedbackTabProps {
  appId: string;
  user?: WidgetUser;
  onSubmit: (payload: FeedbackPayload) => Promise<void> | void;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({ appId, user, onSubmit }) => {
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Files must be under 5MB each');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg('Please enter your feedback message.');
      return;
    }

    if (category === 'support' && !email.trim()) {
      setErrorMsg('Please enter your email so support can reply.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload: FeedbackPayload = {
        appId,
        category,
        message,
        email: email.trim() || undefined,
        user,
        attachments: attachments.length > 0 ? attachments : undefined,
        timestamp: new Date().toISOString(),
      };

      await onSubmit(payload);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rfw-success-box">
        <div className="rfw-success-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <CheckCircle2 size={28} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>Thank You!</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          Your message has been received. We appreciate your feedback!
        </p>
        <button
          className="rfw-btn-submit"
          style={{ width: 'auto', padding: '8px 20px', marginTop: 12 }}
          onClick={() => {
            setIsSubmitted(false);
            setMessage('');
            setAttachments([]);
          }}
        >
          Send Another Message
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

      {/* Category / Type (Optional) */}
      <div className="rfw-field">
        <label className="rfw-label">Topic (Optional)</label>
        <select
          className="rfw-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
        >
          <option value="general">General Feedback</option>
          <option value="bug">Report a Bug</option>
          <option value="feature">Feature Request</option>
          <option value="support">Customer Support</option>
        </select>
      </div>

      {/* Message (The ONE Required Field) */}
      <div className="rfw-field">
        <label className="rfw-label">
          Message <span style={{ color: 'var(--rfw-accent)' }}>*</span>
        </label>
        <textarea
          className="rfw-textarea"
          placeholder="How can we help? Share your thoughts, report an issue, or ask a question."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
        />
      </div>

      {/* Email (Optional, required only for support) */}
      <div className="rfw-field">
        <label className="rfw-label">
          Email {category === 'support' ? <span style={{ color: 'var(--rfw-accent)' }}>*</span> : '(Optional)'}
        </label>
        <input
          type="email"
          className="rfw-input"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={category === 'support'}
        />
      </div>

      {/* Attachments (Optional) */}
      <div className="rfw-field">
        <label className="rfw-label">Screenshot / File (Optional)</label>
        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {attachments.map((att, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: 'var(--rfw-surface-muted)',
                  border: '1px solid var(--rfw-border)',
                  fontSize: 11,
                  color: 'var(--rfw-fg)',
                }}
              >
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--rfw-muted)' }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px dashed var(--rfw-border)',
            backgroundColor: 'var(--rfw-surface-muted)',
            fontSize: 12,
            color: 'var(--rfw-muted)',
            cursor: 'pointer',
            width: 'fit-content',
          }}
        >
          <Paperclip size={14} />
          <span>Attach Screenshot or Log</span>
          <input type="file" onChange={handleFileChange} accept="image/*,.log,.txt,.csv,.json" style={{ display: 'none' }} />
        </label>
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting} style={{ marginTop: 'auto' }}>
        {isSubmitting ? 'Submitting...' : 'Send Message'}
      </button>
    </form>
  );
};
