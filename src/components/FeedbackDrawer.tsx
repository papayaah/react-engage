import React, { useState } from 'react';
import { FeedbackWidgetProps } from '../types';
import { FaqTab } from './tabs/FaqTab';
import { FeedbackFormTab, FeedbackCategory } from './tabs/FeedbackFormTab';
import { NewsletterTab } from './tabs/NewsletterTab';
import { X, HelpCircle, MessageSquare, Mail } from 'lucide-react';

interface FeedbackDrawerProps extends FeedbackWidgetProps {
  onClose: () => void;
  themeMode: 'light' | 'dark';
}

export const FeedbackDrawer: React.FC<FeedbackDrawerProps> = ({
  appId = 'app',
  user,
  faqs,
  labels,
  themeMode,
  endpointUrl,
  onSubmitBug,
  onSubmitSuggestion,
  onSubmitTicket,
  onSubmitNewsletter,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'feedback' | 'newsletter'>('faq');
  const initialFeedbackCategory: FeedbackCategory = 'bug';

  // Fallback submit handlers
  const handleBugSubmit = async (payload: any) => {
    if (onSubmitBug) {
      await onSubmitBug(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'bug', payload);
    } else {
      console.log('[Engage] Bug report payload:', payload);
    }
  };

  const handleSuggestionSubmit = async (payload: any) => {
    if (onSubmitSuggestion) {
      await onSubmitSuggestion(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'suggestion', payload);
    } else {
      console.log('[Engage] Suggestion payload:', payload);
    }
  };

  const handleTicketSubmit = async (payload: any) => {
    if (onSubmitTicket) {
      await onSubmitTicket(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'ticket', payload);
    } else {
      console.log('[Engage] Ticket payload:', payload);
    }
  };

  const handleNewsletterSubmit = async (payload: any) => {
    if (onSubmitNewsletter) {
      await onSubmitNewsletter(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'newsletter', payload);
    } else {
      console.log('[Engage] Newsletter payload:', payload);
    }
  };

  return (
    <div className="rfw-drawer" role="dialog" aria-label="Help & Feedback Drawer">
      {/* Header */}
      <div className="rfw-header">
        <h2 className="rfw-title">{labels?.launcherTitle || 'Help & Feedback'}</h2>
        <button className="rfw-close-btn" onClick={onClose} aria-label="Close panel">
          <X size={18} />
        </button>
      </div>

      {/* 3-Tab Navigation Bar */}
      <div className="rfw-nav">
        <button
          className="rfw-nav-btn"
          data-active={activeTab === 'faq'}
          onClick={() => setActiveTab('faq')}
        >
          <HelpCircle size={15} />
          <span>{labels?.faqTabTitle || 'FAQ'}</span>
        </button>

        <button
          className="rfw-nav-btn"
          data-active={activeTab === 'feedback'}
          onClick={() => setActiveTab('feedback')}
        >
          <MessageSquare size={15} />
          <span>{labels?.bugTabTitle || 'Support'}</span>
        </button>

        <button
          className="rfw-nav-btn"
          data-active={activeTab === 'newsletter'}
          onClick={() => setActiveTab('newsletter')}
        >
          <Mail size={15} />
          <span>{labels?.newsletterTabTitle || 'Newsletter'}</span>
        </button>
      </div>

      {/* Body panel content */}
      <div className="rfw-body">
        {activeTab === 'faq' && <FaqTab faqs={faqs} />}
        {activeTab === 'feedback' && (
          <FeedbackFormTab
            appId={appId}
            user={user}
            themeMode={themeMode}
            initialCategory={initialFeedbackCategory}
            onSubmitBug={handleBugSubmit}
            onSubmitSuggestion={handleSuggestionSubmit}
            onSubmitTicket={handleTicketSubmit}
          />
        )}
        {activeTab === 'newsletter' && (
          <NewsletterTab
            appId={appId}
            user={user}
            onSubmit={handleNewsletterSubmit}
          />
        )}
      </div>
    </div>
  );
};

