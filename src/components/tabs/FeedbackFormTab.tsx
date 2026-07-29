import React, { useState } from 'react';
import {
  BugReportPayload,
  SuggestionPayload,
  TicketPayload,
  BugSeverity,
  SuggestionCategory,
  WidgetUser,
  Attachment,
} from '../../types';
import { useEnvironmentMeta } from '../../hooks/useEnvironmentMeta';
import { CheckCircle2, AlertCircle, Paperclip, X, Bug, Lightbulb, LifeBuoy } from 'lucide-react';

export type FeedbackCategory = 'bug' | 'suggestion' | 'support';

interface FeedbackFormTabProps {
  appId: string;
  user?: WidgetUser;
  themeMode: 'light' | 'dark';
  initialCategory?: FeedbackCategory;
  onSubmitBug: (payload: BugReportPayload) => Promise<void> | void;
  onSubmitSuggestion: (payload: SuggestionPayload) => Promise<void> | void;
  onSubmitTicket: (payload: TicketPayload) => Promise<void> | void;
}

export const FeedbackFormTab: React.FC<FeedbackFormTabProps> = ({
  appId,
  user,
  themeMode,
  initialCategory = 'bug',
  onSubmitBug,
  onSubmitSuggestion,
  onSubmitTicket,
}) => {
  const envMeta = useEnvironmentMeta(themeMode);

  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  
  // Shared & specific form fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [suggestionType, setSuggestionType] = useState<SuggestionCategory>('new_feature');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: event.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation rules:
    // Support requires email and message.
    // Bug / Suggestion require at least a title or message.
    if (category === 'support') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please provide a valid email address so our support team can reply.');
        return;
      }
      if (!message.trim()) {
        setErrorMsg('Please enter your support message.');
        return;
      }
    } else {
      if (!title.trim() && !message.trim()) {
        setErrorMsg('Please fill in a brief summary or description.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (category === 'bug') {
        const payload: BugReportPayload = {
          appId,
          title: title.trim() || 'Bug Report',
          description: message.trim() || title.trim(),
          severity,
          user: { ...user, email: email || user?.email },
          attachments,
          environment: envMeta,
        };
        await onSubmitBug(payload);
      } else if (category === 'suggestion') {
        const payload: SuggestionPayload = {
          appId,
          title: title.trim() || 'Feature Suggestion',
          category: suggestionType,
          description: message.trim() || title.trim(),
          user: { ...user, email: email || user?.email },
          timestamp: new Date().toISOString(),
        };
        await onSubmitSuggestion(payload);
      } else if (category === 'support') {
        const payload: TicketPayload = {
          appId,
          subject: title.trim() || 'Support Request',
          message: message.trim(),
          user: { ...user, email },
          timestamp: new Date().toISOString(),
        };
        await onSubmitTicket(payload);
      }

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
        <div
          className="rfw-success-icon"
          style={{
            backgroundColor:
              category === 'bug'
                ? 'rgba(239, 68, 68, 0.15)'
                : category === 'suggestion'
                ? 'rgba(234, 179, 8, 0.15)'
                : 'rgba(59, 130, 246, 0.15)',
            color:
              category === 'bug'
                ? '#ef4444'
                : category === 'suggestion'
                ? '#eab308'
                : '#3b82f6',
          }}
        >
          <CheckCircle2 size={28} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>
          {category === 'bug'
            ? 'Bug Report Received!'
            : category === 'suggestion'
            ? 'Idea Submitted!'
            : 'Support Ticket Received!'}
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          {category === 'support'
            ? 'Thank you for reaching out. We will respond to your email shortly.'
            : 'Thank you for your feedback! We will review this to improve the app.'}
        </p>
        <button
          className="rfw-btn-submit"
          style={{ width: 'auto', padding: '8px 20px', marginTop: 12 }}
          onClick={() => {
            setIsSubmitted(false);
            setTitle('');
            setMessage('');
            setAttachments([]);
          }}
        >
          Submit More Feedback
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Mini Category Pills inside the parent tab */}
      <div className="rfw-mini-nav">
        <button
          type="button"
          className="rfw-mini-btn"
          data-active={category === 'bug'}
          onClick={() => { setCategory('bug'); setErrorMsg(null); }}
        >
          <Bug size={13} />
          <span>Bug</span>
        </button>

        <button
          type="button"
          className="rfw-mini-btn"
          data-active={category === 'suggestion'}
          onClick={() => { setCategory('suggestion'); setErrorMsg(null); }}
        >
          <Lightbulb size={13} />
          <span>Suggestion</span>
        </button>

        <button
          type="button"
          className="rfw-mini-btn"
          data-active={category === 'support'}
          onClick={() => { setCategory('support'); setErrorMsg(null); }}
        >
          <LifeBuoy size={13} />
          <span>Support</span>
        </button>
      </div>

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

      {/* Dynamic Summary/Subject Field */}
      <div className="rfw-field">
        <label className="rfw-label">
          {category === 'bug'
            ? 'Issue Summary (Optional)'
            : category === 'suggestion'
            ? 'Idea Summary (Optional)'
            : 'Subject (Optional)'}
        </label>
        <input
          type="text"
          className="rfw-input"
          placeholder={
            category === 'bug'
              ? 'e.g. Chart failed to render after date change'
              : category === 'suggestion'
              ? 'e.g. Add dark mode option for charts'
              : 'e.g. Question about my account'
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Category Specific Dropdown */}
      {category === 'bug' && (
        <div className="rfw-field">
          <label className="rfw-label">Severity (Optional)</label>
          <select
            className="rfw-select"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as BugSeverity)}
          >
            <option value="low">Low - Visual tweak or typo</option>
            <option value="medium">Medium - Workflow affected</option>
            <option value="high">High - Feature broken</option>
            <option value="critical">Critical - App crash</option>
          </select>
        </div>
      )}

      {category === 'suggestion' && (
        <div className="rfw-field">
          <label className="rfw-label">Topic (Optional)</label>
          <select
            className="rfw-select"
            value={suggestionType}
            onChange={(e) => setSuggestionType(e.target.value as SuggestionCategory)}
          >
            <option value="new_feature">✨ New Feature</option>
            <option value="ui_ux">🎨 UI / UX Enhancement</option>
            <option value="performance">⚡ Performance</option>
            <option value="integrations">🔗 Integrations</option>
            <option value="other">💡 Other Idea</option>
          </select>
        </div>
      )}

      {/* Message / Description Area */}
      <div className="rfw-field">
        <label className="rfw-label">
          {category === 'support' ? 'Your Message *' : 'Details / Description'}
        </label>
        <textarea
          className="rfw-textarea"
          placeholder={
            category === 'bug'
              ? 'Describe what happened or steps to reproduce...'
              : category === 'suggestion'
              ? 'What problem does this idea solve?'
              : 'How can our team help you?'
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required={category === 'support'}
        />
      </div>

      {/* Email Field - Required for Support, Optional for Bug & Suggestion */}
      <div className="rfw-field">
        <label className="rfw-label">
          {category === 'support' ? 'Your Email *' : 'Your Email (Optional)'}
        </label>
        <input
          type="email"
          className="rfw-input"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={category === 'support'}
        />
      </div>

      {/* Optional Attachments for Bug & Support */}
      {category !== 'suggestion' && (
        <div className="rfw-field">
          <label className="rfw-label">Attachments (Optional)</label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px dashed var(--rfw-card-border)',
              backgroundColor: 'var(--rfw-card-bg)',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--rfw-muted)',
            }}
          >
            <Paperclip size={14} />
            <span>Attach screenshot or log</span>
            <input
              type="file"
              accept="image/*,.log,.json"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {attachments.map((att, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    backgroundColor: 'var(--rfw-card-border)',
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--rfw-fg)',
                  }}
                >
                  {att.name}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeAttachment(i)} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Auto Telemetry Notice for Bugs */}
      {category === 'bug' && (
        <div style={{ fontSize: 11, color: 'var(--rfw-muted)', marginBottom: 12 }}>
          ℹ️ Auto-attaching URL ({envMeta.path}), browser ({envMeta.browser}), and OS ({envMeta.os}).
        </div>
      )}

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting
          ? 'Submitting...'
          : category === 'bug'
          ? 'Submit Bug Report'
          : category === 'suggestion'
          ? 'Submit Suggestion'
          : 'Send Support Request'}
      </button>
    </form>
  );
};
