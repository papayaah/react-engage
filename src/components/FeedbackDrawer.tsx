import React, { useState } from 'react';
import {
  BugReportPayload,
  FeedbackWidgetProps,
  NewsletterPayload,
  SuggestionPayload,
  TicketPayload,
  EngageWidgetContent,
} from '../types';
import { FaqTab } from './tabs/FaqTab';
import { FeedbackFormTab, FeedbackCategory } from './tabs/FeedbackFormTab';
import { NewsletterTab } from './tabs/NewsletterTab';
import { MyTicketsTab } from './tabs/MyTicketsTab';
import { X, HelpCircle, MessageSquare, Mail } from 'lucide-react';
import { resolveEngageContent } from '../content';

interface FeedbackDrawerProps extends FeedbackWidgetProps {
  onClose: () => void;
  themeMode: 'light' | 'dark';
  resolvedContent?: EngageWidgetContent;
}

export const FeedbackDrawer: React.FC<FeedbackDrawerProps> = ({
  appId = 'app',
  user,
  faqs,
  labels,
  content,
  resolvedContent,
  themeMode,
  endpointUrl,
  onSubmitBug,
  onSubmitSuggestion,
  onSubmitTicket,
  onSubmitNewsletter,
  onClose,
}) => {
  const copy = resolvedContent ?? resolveEngageContent(content, labels);
  const [activeTab, setActiveTab] = useState<'faq' | 'feedback' | 'newsletter'>('faq');
  const [supportView, setSupportView] = useState<'new' | 'tickets'>('new');
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);
  const initialFeedbackCategory: FeedbackCategory = 'bug';

  // Fallback submit handlers
  const handleBugSubmit = async (payload: BugReportPayload) => {
    if (onSubmitBug) {
      await onSubmitBug(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'bug', payload);
    } else {
      console.log('[Engage] Bug report payload:', payload);
    }
    setTicketRefreshKey((current) => current + 1);
  };

  const handleSuggestionSubmit = async (payload: SuggestionPayload) => {
    if (onSubmitSuggestion) {
      await onSubmitSuggestion(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'suggestion', payload);
    } else {
      console.log('[Engage] Suggestion payload:', payload);
    }
    setTicketRefreshKey((current) => current + 1);
  };

  const handleTicketSubmit = async (payload: TicketPayload) => {
    if (onSubmitTicket) {
      await onSubmitTicket(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'ticket', payload);
    } else {
      console.log('[Engage] Ticket payload:', payload);
    }
    setTicketRefreshKey((current) => current + 1);
  };

  const handleNewsletterSubmit = async (payload: NewsletterPayload) => {
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
    <div className="rfw-drawer" role="dialog" aria-label={copy.launcher.drawerAriaLabel}>
      {/* Header */}
      <div className="rfw-header">
        <h2 className="rfw-title">{copy.launcher.title}</h2>
        <button className="rfw-close-btn" onClick={onClose} aria-label={copy.launcher.closeLabel}>
          <X size={18} />
        </button>
      </div>

      {/* Main navigation */}
      <div className="rfw-nav">
        <button
          className="rfw-nav-btn"
          data-active={activeTab === 'faq'}
          onClick={() => setActiveTab('faq')}
        >
          <HelpCircle size={15} />
          <span>{copy.tabs.faq}</span>
        </button>

        <button
          className="rfw-nav-btn"
          data-active={activeTab === 'feedback'}
          onClick={() => {
            setActiveTab('feedback');
            setSupportView('new');
          }}
        >
          <MessageSquare size={15} />
          <span>{copy.tabs.support}</span>
        </button>

        <button
          className="rfw-nav-btn"
          data-active={activeTab === 'newsletter'}
          onClick={() => setActiveTab('newsletter')}
        >
          <Mail size={15} />
          <span>{copy.tabs.newsletter}</span>
        </button>
      </div>

      {/* Body panel content */}
      <div className="rfw-body">
        {activeTab === 'faq' && <FaqTab faqs={faqs ?? copy.faq.items} content={copy.faq} />}
        {activeTab === 'feedback' && (
          <div className="rfw-support-panel">
            {supportView === 'new' ? (
              <FeedbackFormTab
                appId={appId}
                user={user}
                themeMode={themeMode}
                initialCategory={initialFeedbackCategory}
                onSubmitBug={handleBugSubmit}
                onSubmitSuggestion={handleSuggestionSubmit}
                onSubmitTicket={handleTicketSubmit}
                onViewTickets={() => setSupportView('tickets')}
                content={copy.feedback}
              />
            ) : (
              <MyTicketsTab
                endpointUrl={endpointUrl}
                user={user}
                refreshKey={ticketRefreshKey}
                onBack={() => setSupportView('new')}
                content={copy.tickets}
              />
            )}
          </div>
        )}
        {activeTab === 'newsletter' && (
          <NewsletterTab
            appId={appId}
            user={user}
            onSubmit={handleNewsletterSubmit}
            content={copy.newsletter}
          />
        )}
      </div>
    </div>
  );
};
