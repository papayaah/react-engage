import React, { useState } from 'react';
import { BugReportPayload, BugSeverity, WidgetUser, Attachment, EngageWidgetContent } from '../../types';
import { useEnvironmentMeta } from '../../hooks/useEnvironmentMeta';
import { CheckCircle2, AlertCircle, Paperclip, X } from 'lucide-react';
import { DEFAULT_ENGAGE_CONTENT, interpolateContent } from '../../content';

interface BugReportTabProps {
  appId: string;
  user?: WidgetUser;
  themeMode: 'light' | 'dark';
  onSubmit: (payload: BugReportPayload) => Promise<void> | void;
  content?: EngageWidgetContent['feedback'];
}

export const BugReportTab: React.FC<BugReportTabProps> = ({
  appId,
  user,
  themeMode,
  onSubmit,
  content = DEFAULT_ENGAGE_CONTENT.feedback,
}) => {
  const envMeta = useEnvironmentMeta(themeMode);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [email, setEmail] = useState(user?.email || '');
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
    if (!title.trim() || !description.trim()) {
      setErrorMsg(content.validation.missingSummary);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload: BugReportPayload = {
        appId,
        title,
        description,
        severity,
        user: {
          ...user,
          email: email || user?.email,
        },
        attachments,
        environment: envMeta,
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
        <div className="rfw-success-icon">
          <CheckCircle2 size={28} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>{content.success.bugTitle}</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          {content.success.feedbackMessage}
        </p>
        <button
          className="rfw-btn-submit"
          style={{ width: 'auto', padding: '8px 20px', marginTop: 12 }}
          onClick={() => {
            setIsSubmitted(false);
            setTitle('');
            setDescription('');
            setAttachments([]);
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
        <label className="rfw-label">{content.summaryLabels.bug}</label>
        <input
          type="text"
          className="rfw-input"
          placeholder={content.summaryPlaceholders.bug}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.severityLabel}</label>
        <select
          className="rfw-select"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as BugSeverity)}
        >
          <option value="low">{content.severityOptions.low}</option>
          <option value="medium">{content.severityOptions.medium}</option>
          <option value="high">{content.severityOptions.high}</option>
          <option value="critical">{content.severityOptions.critical}</option>
        </select>
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.messageLabels.feedback}</label>
        <textarea
          className="rfw-textarea"
          placeholder={content.messagePlaceholders.bug}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.emailLabels.optional}</label>
        <input
          type="email"
          className="rfw-input"
          placeholder={content.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Attachments */}
      <div className="rfw-field">
        <label className="rfw-label">{content.attachmentsLabel}</label>
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
          <span>{content.attachmentAction}</span>
          <input type="file" accept="image/*,.log,.json" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
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

      <div style={{ fontSize: 11, color: 'var(--rfw-muted)', marginBottom: 12 }}>
        ℹ️ {interpolateContent(content.telemetryNotice, { path: envMeta.path, browser: envMeta.browser, os: envMeta.os })}
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting ? content.submitButtons.submitting : content.submitButtons.bug}
      </button>
    </form>
  );
};
