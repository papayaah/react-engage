import React, { useState } from 'react';
import { SuggestionPayload, SuggestionCategory, WidgetUser, EngageWidgetContent } from '../../types';
import { AlertCircle, Lightbulb } from 'lucide-react';
import { DEFAULT_ENGAGE_CONTENT } from '../../content';

interface SuggestionTabProps {
  appId: string;
  user?: WidgetUser;
  onSubmit: (payload: SuggestionPayload) => Promise<void> | void;
  content?: EngageWidgetContent['feedback'];
}

export const SuggestionTab: React.FC<SuggestionTabProps> = ({ appId, user, onSubmit, content = DEFAULT_ENGAGE_CONTENT.feedback }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('new_feature');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg(content.validation.missingSummary);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload: SuggestionPayload = {
        appId,
        title,
        category,
        description,
        user,
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
        <div className="rfw-success-icon" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
          <Lightbulb size={28} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>{content.success.suggestionTitle}</h3>
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
        <label className="rfw-label">{content.summaryLabels.suggestion}</label>
        <input
          type="text"
          className="rfw-input"
          placeholder={content.summaryPlaceholders.suggestion}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.suggestionTopicLabel}</label>
        <select
          className="rfw-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as SuggestionCategory)}
        >
          <option value="new_feature">{content.suggestionTopicOptions.new_feature}</option>
          <option value="ui_ux">{content.suggestionTopicOptions.ui_ux}</option>
          <option value="performance">{content.suggestionTopicOptions.performance}</option>
          <option value="integrations">{content.suggestionTopicOptions.integrations}</option>
          <option value="other">{content.suggestionTopicOptions.other}</option>
        </select>
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.messageLabels.feedback || 'Description'}</label>
        <textarea
          className="rfw-textarea"
          placeholder={content.messagePlaceholders.suggestion}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting ? content.submitButtons.submitting : content.submitButtons.suggestion}
      </button>
    </form>
  );
};
