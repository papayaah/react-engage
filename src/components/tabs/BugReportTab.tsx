import React, { useState } from 'react';
import { BugReportPayload, BugSeverity, WidgetUser, Attachment } from '../../types';
import { useEnvironmentMeta } from '../../hooks/useEnvironmentMeta';
import { CheckCircle2, AlertCircle, Paperclip, X } from 'lucide-react';

interface BugReportTabProps {
  appId: string;
  user?: WidgetUser;
  themeMode: 'light' | 'dark';
  onSubmit: (payload: BugReportPayload) => Promise<void> | void;
}

export const BugReportTab: React.FC<BugReportTabProps> = ({
  appId,
  user,
  themeMode,
  onSubmit,
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
      setErrorMsg('Please enter a summary and description.');
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
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit bug report');
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
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>Bug Report Received!</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          Thank you for reporting this. Our engineering team will review the captured metadata and details.
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
          Report Another Issue
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
        <label className="rfw-label">Issue Summary</label>
        <input
          type="text"
          className="rfw-input"
          placeholder="e.g. Chart failed to render after date range change"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Severity Level</label>
        <select
          className="rfw-select"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as BugSeverity)}
        >
          <option value="low">Low - Visual tweak or typo</option>
          <option value="medium">Medium - Normal workflow affected</option>
          <option value="high">High - Feature broken or error screen</option>
          <option value="critical">Critical - App crash or data issue</option>
        </select>
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Description & Steps to Reproduce</label>
        <textarea
          className="rfw-textarea"
          placeholder="Describe what happened and how to trigger it..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Your Email (for updates)</label>
        <input
          type="email"
          className="rfw-input"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Attachments */}
      <div className="rfw-field">
        <label className="rfw-label">Attachments / Screenshot</label>
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
          <span>Attach image or file</span>
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
        ℹ️ Auto-capturing URL ({envMeta.path}), browser ({envMeta.browser}), and OS ({envMeta.os}).
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
      </button>
    </form>
  );
};
