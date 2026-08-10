'use client';

import React, { useState } from 'react';
import { NewsletterPayload, WidgetUser } from '../../types';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewsletterTabProps {
  appId: string;
  user?: WidgetUser;
  onSubmit: (payload: NewsletterPayload) => Promise<void> | void;
}

export const NewsletterTab: React.FC<NewsletterTabProps> = ({ appId, user, onSubmit }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.name || '');
  const [frequency, setFrequency] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload: NewsletterPayload = {
        appId,
        email: email.trim(),
        name: name.trim() || undefined,
        frequency,
        timestamp: new Date().toISOString(),
      };

      await onSubmit(payload);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to subscribe');
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
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--rfw-fg)' }}>You're Subscribed!</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--rfw-muted)' }}>
          Thank you for subscribing! Check your inbox for updates and product releases.
        </p>
        <button
          className="rfw-btn-submit"
          style={{ width: 'auto', padding: '8px 20px', marginTop: 12 }}
          onClick={() => setIsSubmitted(false)}
        >
          Manage Preferences
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 12px', backgroundColor: 'var(--rfw-card-bg)', borderRadius: 8, border: '1px solid var(--rfw-card-border)' }}>
        <Mail size={22} style={{ color: 'var(--rfw-accent)', flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: 'var(--rfw-fg)' }}>
          <strong>Product Updates & Newsletter</strong>
          <div style={{ color: 'var(--rfw-muted)', marginTop: 2 }}>Get new features, tips, and market insights straight to your inbox.</div>
        </div>
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Your Email</label>
        <input
          type="email"
          className="rfw-input"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Your Name (Optional)</label>
        <input
          type="text"
          className="rfw-input"
          placeholder="e.g. Alex"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">Email Frequency</label>
        <select
          className="rfw-input"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as any)}
        >
          <option value="all">All Updates & Product News</option>
          <option value="weekly">Weekly Summary Digest</option>
          <option value="monthly">Monthly Major Releases Only</option>
        </select>
      </div>

      <button type="submit" className="rfw-btn-submit" disabled={isSubmitting} style={{ marginTop: 'auto' }}>
        {isSubmitting ? 'Subscribing...' : 'Subscribe to Newsletter'}
      </button>
    </form>
  );
};
