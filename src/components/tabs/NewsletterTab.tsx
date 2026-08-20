'use client';

import React, { useState, useEffect } from 'react';
import { EngageWidgetContent, NewsletterPayload, WidgetUser } from '../../types';
import { Mail, CheckCircle2, AlertCircle, UserMinus, RotateCcw } from 'lucide-react';
import { DEFAULT_ENGAGE_CONTENT, interpolateContent } from '../../content';

interface NewsletterTabProps {
  appId: string;
  user?: WidgetUser;
  onSubmit: (payload: NewsletterPayload) => Promise<void> | void;
  content?: EngageWidgetContent['newsletter'];
}

export const NewsletterTab: React.FC<NewsletterTabProps> = ({
  appId,
  user,
  onSubmit,
  content = DEFAULT_ENGAGE_CONTENT.newsletter,
}) => {
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('engage_subscribed_email');
      if (saved) return saved;
    }
    return user?.email || '';
  });

  const [name, setName] = useState(user?.name || '');
  const [frequency, setFrequency] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSubmitted, setIsSubmitted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('engage_is_subscribed') === 'true';
    }
    return false;
  });

  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const [showManagePrefs, setShowManagePrefs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync user prop if logged in and no local override exists
  useEffect(() => {
    if (user?.email && typeof window !== 'undefined' && !localStorage.getItem('engage_subscribed_email')) {
      setEmail(user.email);
    }
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [name, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg(content.validationEmail);
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
        action: 'subscribe',
        timestamp: new Date().toISOString(),
      };

      await onSubmit(payload);

      if (typeof window !== 'undefined') {
        localStorage.setItem('engage_subscribed_email', email.trim());
        localStorage.setItem('engage_is_subscribed', 'true');
      }

      setIsSubmitted(true);
      setShowManagePrefs(false);
      setIsUnsubscribed(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : content.subscribeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: NewsletterPayload = {
        appId,
        email: email.trim(),
        action: 'unsubscribe',
        timestamp: new Date().toISOString(),
      };

      await onSubmit(payload);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('engage_is_subscribed');
      }

      setIsUnsubscribed(true);
      setIsSubmitted(false);
      setShowManagePrefs(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : content.unsubscribeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // State 1: Unsubscribed Confirmation Screen
  if (isUnsubscribed) {
    return (
      <div className="rfw-success-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px' }}>
        <div className="rfw-success-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: 12, padding: 12, borderRadius: '50%' }}>
          <UserMinus size={28} />
        </div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: 'var(--rfw-fg)' }}>{content.unsubscribedTitle}</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--rfw-muted)', lineHeight: 1.4 }}>
          {interpolateContent(content.unsubscribedMessage, { email })}
        </p>
        <button
          className="rfw-btn-submit"
          style={{ width: 'auto', padding: '8px 20px' }}
          onClick={() => {
            setIsUnsubscribed(false);
            setIsSubmitted(false);
            setShowManagePrefs(false);
          }}
        >
          {content.resubscribeButton}
        </button>
      </div>
    );
  }

  // State 2: Subscribed Confirmation Screen (Default Success)
  if (isSubmitted && !showManagePrefs) {
    return (
      <div className="rfw-success-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px' }}>
        <div className="rfw-success-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', marginBottom: 12, padding: 12, borderRadius: '50%' }}>
          <CheckCircle2 size={28} />
        </div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: 'var(--rfw-fg)' }}>{content.subscribedTitle}</h3>
        <p style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--rfw-muted)', lineHeight: 1.4 }}>
          {content.subscribedMessage}
        </p>
        <div style={{ fontSize: 12, color: 'var(--rfw-accent)', fontWeight: 600, marginBottom: 16 }}>
          {content.subscribedEmailLabel}: {email}
        </div>
        <button
          className="rfw-btn-submit"
          style={{ width: 'auto', padding: '8px 20px' }}
          onClick={() => setShowManagePrefs(true)}
        >
          {content.manageButton}
        </button>
      </div>
    );
  }

  // State 3: Form / Preference Editing Mode
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
          <strong>{showManagePrefs ? content.manageTitle : content.subscribeTitle}</strong>
          <div style={{ color: 'var(--rfw-muted)', marginTop: 2 }}>
            {showManagePrefs ? content.manageDescription : content.subscribeDescription}
          </div>
        </div>
      </div>

      <div className="rfw-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label className="rfw-label" style={{ margin: 0 }}>{content.emailLabel}</label>
          {user?.email && email !== user.email && (
            <button
              type="button"
              onClick={() => setEmail(user.email || '')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--rfw-accent)',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: 0,
              }}
            >
              <RotateCcw size={11} /> {interpolateContent(content.useAccountEmail, { email: user.email })}
            </button>
          )}
        </div>
        <input
          type="email"
          className="rfw-input"
          placeholder={content.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.nameLabel}</label>
        <input
          type="text"
          className="rfw-input"
          placeholder={content.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="rfw-field">
        <label className="rfw-label">{content.frequencyLabel}</label>
        <select
          className="rfw-input"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as 'all' | 'weekly' | 'monthly')}
        >
          <option value="all">{content.frequencyOptions.all}</option>
          <option value="weekly">{content.frequencyOptions.weekly}</option>
          <option value="monthly">{content.frequencyOptions.monthly}</option>
        </select>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="submit" className="rfw-btn-submit" disabled={isSubmitting}>
          {isSubmitting ? content.savingButton : showManagePrefs ? content.savePreferencesButton : content.subscribeButton}
        </button>

        {showManagePrefs && (
          <button
            type="button"
            onClick={handleUnsubscribe}
            disabled={isSubmitting}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--rfw-loss, #ef4444)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {content.unsubscribeButton}
          </button>
        )}
      </div>
    </form>
  );
};
