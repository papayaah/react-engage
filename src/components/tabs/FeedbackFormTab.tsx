import React, { useState } from 'react';
import {
  BugReportPayload,
  SuggestionPayload,
  TicketPayload,
  BugSeverity,
  SuggestionCategory,
  WidgetUser,
  Attachment,
  EngageWidgetContent,
} from '../../types';
import { useEnvironmentMeta } from '../../hooks/useEnvironmentMeta';
import { CheckCircle2, AlertCircle, Paperclip, X, Bug, Lightbulb, LifeBuoy, Inbox } from 'lucide-react';
import { DEFAULT_ENGAGE_CONTENT, interpolateContent } from '../../content';

import { SuggestionList } from './SuggestionList';

export type FeedbackCategory = 'bug' | 'suggestion' | 'support';

interface FeedbackFormTabProps {
  appId: string;
  user?: WidgetUser;
  themeMode: 'light' | 'dark';
  initialCategory?: FeedbackCategory;
  endpointUrl?: string;
  onSubmitBug: (payload: BugReportPayload) => Promise<void> | void;
  onSubmitSuggestion: (payload: SuggestionPayload) => Promise<void> | void;
  onVoteSuggestion?: (suggestionId: string, action: 'upvote' | 'unvote') => Promise<void> | void;
  onSubmitTicket: (payload: TicketPayload) => Promise<void> | void;
  onViewTickets?: () => void;
  enableCommunityRoadmap?: boolean;
  content?: EngageWidgetContent['feedback'];
  suggestionsContent?: EngageWidgetContent['suggestions'];
}

export const FeedbackFormTab: React.FC<FeedbackFormTabProps> = ({
  appId,
  user,
  themeMode,
  initialCategory = 'bug',
  endpointUrl,
  onSubmitBug,
  onSubmitSuggestion,
  onVoteSuggestion,
  onSubmitTicket,
  onViewTickets,
  enableCommunityRoadmap = true,
  content = DEFAULT_ENGAGE_CONTENT.feedback,
  suggestionsContent = DEFAULT_ENGAGE_CONTENT.suggestions,
}) => {
  const envMeta = useEnvironmentMeta(themeMode);

  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [suggestionMode, setSuggestionMode] = useState<'list' | 'create'>('list');
  
  // Shared & specific form fields
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

    // Validation rules: the description/message is the single required field.
    // Support additionally requires a reply email.
    if (category === 'support') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg(content.validation.invalidEmail);
        return;
      }
      if (!message.trim()) {
        setErrorMsg(content.validation.missingSupportMessage);
        return;
      }
    } else {
      if (!message.trim()) {
        setErrorMsg(content.validation.missingSummary);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (category === 'bug') {
        const payload: BugReportPayload = {
          appId,
          title: content.payloadDefaults.bugTitle,
          description: message.trim(),
          severity,
          user: { ...user, email: email || user?.email },
          attachments,
          environment: envMeta,
        };
        await onSubmitBug(payload);
      } else if (category === 'suggestion') {
        const payload: SuggestionPayload = {
          appId,
          title: content.payloadDefaults.suggestionTitle,
          category: suggestionType,
          description: message.trim(),
          user: { ...user, email: email || user?.email },
          timestamp: new Date().toISOString(),
        };
        await onSubmitSuggestion(payload);
      } else if (category === 'support') {
        const payload: TicketPayload = {
          appId,
          subject: content.payloadDefaults.supportSubject,
          message: message.trim(),
          user: { ...user, email },
          timestamp: new Date().toISOString(),
        };
        await onSubmitTicket(payload);
      }

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
            ? content.success.bugTitle
            : category === 'suggestion'
            ? content.success.suggestionTitle
            : content.success.supportTitle}
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          {category === 'support'
            ? content.success.supportMessage
            : content.success.feedbackMessage}
        </p>
        <div className="rfw-success-actions">
          {onViewTickets ? (
            <button type="button" className="rfw-btn-submit" onClick={onViewTickets}>
              {content.success.viewTicketsButton}
            </button>
          ) : null}
          <button
            type="button"
            className="rfw-btn-secondary"
            onClick={() => {
              setIsSubmitted(false);
              setMessage('');
              setAttachments([]);
            }}
          >
            {content.success.submitMoreButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Mini Category Pills inside the parent tab */}
      <div className="rfw-mini-nav">
        <button
          type="button"
          className="rfw-mini-btn"
          data-active={category === 'bug'}
          onClick={() => { setCategory('bug'); setErrorMsg(null); }}
        >
          <Bug size={13} />
          <span>{content.categories.bug}</span>
        </button>

        <button
          type="button"
          className="rfw-mini-btn"
          data-active={category === 'suggestion'}
          onClick={() => { setCategory('suggestion'); setErrorMsg(null); }}
        >
          <Lightbulb size={13} />
          <span>{content.categories.suggestion}</span>
        </button>

        <button
          type="button"
          className="rfw-mini-btn"
          data-active={category === 'support'}
          onClick={() => { setCategory('support'); setErrorMsg(null); }}
        >
          <LifeBuoy size={13} />
          <span>{content.categories.support}</span>
        </button>

        {onViewTickets ? (
          <button
            type="button"
            className="rfw-mini-btn rfw-mini-btn-icon"
            onClick={onViewTickets}
            aria-label={content.viewTicketsLabel}
            title={content.myTicketsLabel}
          >
            <Inbox size={14} />
          </button>
        ) : null}
      </div>

      {category === 'suggestion' && suggestionMode === 'list' && enableCommunityRoadmap ? (
        <SuggestionList
          appId={appId}
          user={user}
          endpointUrl={endpointUrl}
          onVoteSuggestion={onVoteSuggestion}
          onCreateNew={() => {
            setSuggestionMode('create');
            setErrorMsg(null);
          }}
          content={suggestionsContent}
        />
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {category === 'suggestion' && enableCommunityRoadmap && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setSuggestionMode('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--rfw-accent)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ← Back to Community Ideas
              </button>
            </div>
          )}

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

      {/* Required Field: Description / Message (always on top) */}
      <div className="rfw-field">
        <label className="rfw-label">
          {category === 'support' ? content.messageLabels.support : content.messageLabels.feedback}{' '}
          <span style={{ color: 'var(--rfw-accent)' }}>*</span>
        </label>
        <textarea
          className="rfw-textarea"
          placeholder={content.messagePlaceholders[category]}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      {/* Optional: Category Specific Dropdown */}
      {category === 'bug' && (
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
      )}

      {category === 'suggestion' && (
        <div className="rfw-field">
          <label className="rfw-label">{content.suggestionTopicLabel}</label>
          <select
            className="rfw-select"
            value={suggestionType}
            onChange={(e) => setSuggestionType(e.target.value as SuggestionCategory)}
          >
            <option value="new_feature">{content.suggestionTopicOptions.new_feature}</option>
            <option value="ui_ux">{content.suggestionTopicOptions.ui_ux}</option>
            <option value="performance">{content.suggestionTopicOptions.performance}</option>
            <option value="integrations">{content.suggestionTopicOptions.integrations}</option>
            <option value="other">{content.suggestionTopicOptions.other}</option>
          </select>
        </div>
      )}

      {/* Optional (Required for Support): Reply Email */}
      <div className="rfw-field">
        <label className="rfw-label">
          {category === 'support' ? content.emailLabels.required : content.emailLabels.optional}
        </label>
        <input
          type="email"
          className="rfw-input"
          placeholder={content.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={category === 'support'}
        />
      </div>

      {/* Optional Attachments for Bug & Support */}
      {category !== 'suggestion' && (
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
          {interpolateContent(content.telemetryNotice, {
            path: envMeta.path,
            browser: envMeta.browser,
            os: envMeta.os,
          })}
        </div>
      )}

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting
          ? content.submitButtons.submitting
          : category === 'bug'
          ? content.submitButtons.bug
          : category === 'suggestion'
          ? content.submitButtons.suggestion
          : content.submitButtons.support}
      </button>
    </form>
    )}
  </div>
);
};
