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
import { AreaSnipOverlay } from '../AreaSnipOverlay';
import { CheckCircle2, AlertCircle, Paperclip, X, Bug, Lightbulb, LifeBuoy, Inbox, Crop, Image as ImageIcon, FileText } from 'lucide-react';

export type FeedbackCategory = 'bug' | 'suggestion' | 'support';

interface FeedbackFormTabProps {
  appId: string;
  user?: WidgetUser;
  themeMode: 'light' | 'dark';
  initialCategory?: FeedbackCategory;
  onSubmitBug: (payload: BugReportPayload) => Promise<void> | void;
  onSubmitSuggestion: (payload: SuggestionPayload) => Promise<void> | void;
  onSubmitTicket: (payload: TicketPayload) => Promise<void> | void;
  onViewTickets?: () => void;
}

export const FeedbackFormTab: React.FC<FeedbackFormTabProps> = ({
  appId,
  user,
  themeMode,
  initialCategory = 'bug',
  onSubmitBug,
  onSubmitSuggestion,
  onSubmitTicket,
  onViewTickets,
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
  const [isDragging, setIsDragging] = useState(false);
  const [isSnipping, setIsSnipping] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" exceeds 10MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name || `attachment-${Date.now()}`,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: event.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      addFiles(files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation rules:
    // Description/Message is required for all categories.
    // Support also requires a valid email.
    if (!message.trim()) {
      setErrorMsg(category === 'support' ? 'Please enter your message.' : 'Please enter a description.');
      return;
    }

    if (category === 'support') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please provide a valid email address so our support team can reply.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (category === 'bug') {
        const payload: BugReportPayload = {
          appId,
          title: title.trim() || 'Bug Report',
          description: message.trim(),
          severity,
          email: email.trim() || user?.email,
          user: { ...user, email: email.trim() || user?.email },
          attachments: attachments.length > 0 ? attachments : undefined,
          environment: envMeta,
        };
        await onSubmitBug(payload);
      } else if (category === 'suggestion') {
        const payload: SuggestionPayload = {
          appId,
          title: title.trim() || 'Feature Suggestion',
          category: suggestionType,
          description: message.trim(),
          email: email.trim() || user?.email,
          user: { ...user, email: email.trim() || user?.email },
          attachments: attachments.length > 0 ? attachments : undefined,
          timestamp: new Date().toISOString(),
        };
        await onSubmitSuggestion(payload);
      } else if (category === 'support') {
        const payload: TicketPayload = {
          appId,
          subject: title.trim() || 'Support Request',
          message: message.trim(),
          email: email.trim() || user?.email,
          user: { ...user, email: email.trim() || user?.email },
          attachments: attachments.length > 0 ? attachments : undefined,
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
        <div className="rfw-success-actions">
          {onViewTickets ? (
            <button type="button" className="rfw-btn-submit" onClick={onViewTickets}>
              View My Tickets
            </button>
          ) : null}
          <button
            type="button"
            className="rfw-btn-secondary"
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
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
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

        {onViewTickets ? (
          <button
            type="button"
            className="rfw-mini-btn rfw-mini-btn-icon"
            onClick={onViewTickets}
            aria-label="View my tickets"
            title="My tickets"
          >
            <Inbox size={14} />
          </button>
        ) : null}
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

      {/* Description / Message Area (Required, at top) */}
      <div className="rfw-field">
        <label className="rfw-label">
          {category === 'support' ? 'Message' : 'Description'}
        </label>
        <textarea
          className="rfw-textarea"
          placeholder={
            category === 'bug'
              ? 'Describe what happened or steps to reproduce...'
              : category === 'suggestion'
              ? 'What problem does this idea solve or how can we improve?'
              : 'How can our team help you?'
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

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
              ? 'e.g. Navigation menu failed to open'
              : category === 'suggestion'
              ? 'e.g. Add dark mode option or export support'
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
            <option value="new_feature">New Feature</option>
            <option value="ui_ux">UI / UX Enhancement</option>
            <option value="performance">Performance</option>
            <option value="integrations">Integrations</option>
            <option value="other">Other Idea</option>
          </select>
        </div>
      )}

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

      {/* Attachments & Screen Capture Area */}
      <div className="rfw-field">
        <label className="rfw-label">Attachments (Optional)</label>
        <div
          className="rfw-dropzone"
          data-dragging={isDragging}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="rfw-dropzone-actions">
            <label className="rfw-dropzone-btn">
              <Paperclip size={14} />
              <span>Attach file</span>
              <input
                type="file"
                accept="image/*,.log,.json,.txt,.csv"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              className="rfw-dropzone-btn"
              onClick={() => setIsSnipping(true)}
              title="Click and drag to capture an area or spot on the page"
            >
              <Crop size={14} />
              <span>Capture area</span>
            </button>
          </div>
          <div className="rfw-dropzone-hint">
            Drop files here or paste from clipboard (Ctrl/Cmd+V)
          </div>
        </div>

        {/* Attachment List */}
        {attachments.length > 0 && (
          <div className="rfw-attachment-list">
            {attachments.map((att, i) => {
              const isImage = att.type.startsWith('image/') && att.dataUrl;
              return (
                <div key={i} className="rfw-attachment-item">
                  {isImage ? (
                    <img src={att.dataUrl} alt={att.name} className="rfw-attachment-thumb" />
                  ) : (
                    <FileText size={14} className="rfw-attachment-icon" />
                  )}
                  <span className="rfw-attachment-name" title={att.name}>{att.name}</span>
                  <span className="rfw-attachment-size">
                    ({Math.round(att.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    className="rfw-attachment-remove"
                    onClick={() => removeAttachment(i)}
                    aria-label={`Remove ${att.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto Telemetry Notice for Bugs */}
      {category === 'bug' && (
        <div style={{ fontSize: 11, color: 'var(--rfw-muted)', marginBottom: 12 }}>
          Auto-attaching URL ({envMeta.path}), browser ({envMeta.browser}), and OS ({envMeta.os}).
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

      {/* In-Page Area Snipping Overlay */}
      {isSnipping && (
        <AreaSnipOverlay
          onCapture={(attachment) => {
            setAttachments((prev) => [...prev, attachment]);
            setIsSnipping(false);
          }}
          onCancel={() => setIsSnipping(false)}
        />
      )}
    </form>
  );
};
