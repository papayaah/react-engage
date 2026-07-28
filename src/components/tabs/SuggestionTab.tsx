import React, { useState } from 'react';
import { SuggestionPayload, SuggestionCategory, WidgetUser } from '../../types';
import { CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';

interface SuggestionTabProps {
  appId: string;
  user?: WidgetUser;
  onSubmit: (payload: SuggestionPayload) => Promise<void> | void;
}

export const SuggestionTab: React.FC<SuggestionTabProps> = ({ appId, user, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('new_feature');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please enter a title and description.');
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
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit suggestion');
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
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>Idea Submitted!</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          We love feedback! Your feature suggestion has been recorded for roadmap consideration.
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
          Submit Another Suggestion
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
        <label className="rfw-label">Idea Title</label>
        <input
          type="text"
          className="rfw-input"
          placeholder="e.g. Add dark mode option for charts"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Category</label>
        <select
          className="rfw-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as SuggestionCategory)}
        >
          <option value="new_feature">✨ New Feature</option>
          <option value="ui_ux">🎨 UI / UX Enhancement</option>
          <option value="performance">⚡ Performance Improvement</option>
          <option value="integrations">🔗 Integration / API</option>
          <option value="other">💡 Other Idea</option>
        </select>
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Detailed Proposal</label>
        <textarea
          className="rfw-textarea"
          placeholder="How would this feature help you? What problem does it solve?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
      </button>
    </form>
  );
};
