import React, { useState } from 'react';
import { BugReportPayload, BugSeverity, WidgetUser, Attachment, EngageWidgetContent } from '../../types';
import { useEnvironmentMeta } from '../../hooks/useEnvironmentMeta';
import { AreaSnipOverlay } from '../AreaSnipOverlay';
import { CheckCircle2, AlertCircle, Paperclip, X, Crop, FileText } from 'lucide-react';
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
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
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
        <label className="rfw-label">{content.attachmentsLabel || 'Attachments (Optional)'}</label>
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
              <span>{content.attachmentAction || 'Attach file'}</span>
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

      <div style={{ fontSize: 11, color: 'var(--rfw-muted)', marginBottom: 12 }}>
        ℹ️ {interpolateContent(content.telemetryNotice, { path: envMeta.path, browser: envMeta.browser, os: envMeta.os })}
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting ? content.submitButtons.submitting : content.submitButtons.bug}
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
