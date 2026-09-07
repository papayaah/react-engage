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
  onVoteSuggestion,
  onSubmitTicket,
  onSubmitNewsletter,
  enableCommunityRoadmap = true,
  enabledTabs = ['faq', 'feedback', 'newsletter'],
  defaultTab,
  onClose,
}) => {
  const copy = resolvedContent ?? resolveEngageContent(content, labels);

  // The drawer's top-level navigation only exposes these three tabs; the other
  // TabId values ('bug' | 'suggestion' | 'ticket') are sub-views inside Support.
  // `enabledTabs` lets a host hide any of them (e.g. drop 'newsletter').
  const NAV_TABS = ['faq', 'feedback', 'newsletter'] as const;
  type NavTab = (typeof NAV_TABS)[number];
  const visibleTabs = NAV_TABS.filter((t) => enabledTabs.includes(t));
  const isEnabled = (t: NavTab) => visibleTabs.includes(t);

  const initialTab: NavTab =
    defaultTab && visibleTabs.includes(defaultTab as NavTab)
      ? (defaultTab as NavTab)
      : visibleTabs[0] ?? 'faq';
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);
  const [supportView, setSupportView] = useState<'new' | 'tickets'>('new');
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);
  const initialFeedbackCategory: FeedbackCategory = 'bug';

  const saveLocalTicket = (ticketId?: string) => {
    if (!ticketId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('engage_my_tickets');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(ticketId)) {
        list.unshift(ticketId);
        localStorage.setItem('engage_my_tickets', JSON.stringify(list.slice(0, 50)));
      }
    } catch (e) {
      console.warn('[Engage] Failed to save ticket to localStorage:', e);
    }
  };

  // Fallback submit handlers
  const handleBugSubmit = async (payload: BugReportPayload) => {
    if (onSubmitBug) {
      await onSubmitBug(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      const res = await sendPayloadToEndpoint(endpointUrl, 'bug', payload);
      if (res?.ticketId) saveLocalTicket(res.ticketId);
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
      const res = await sendPayloadToEndpoint(endpointUrl, 'suggestion', payload);
      if (res?.ticketId) saveLocalTicket(res.ticketId);
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
      const res = await sendPayloadToEndpoint(endpointUrl, 'ticket', payload);
      if (res?.ticketId) saveLocalTicket(res.ticketId);
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
        {isEnabled('faq') && (
          <button
            className="rfw-nav-btn"
            data-active={activeTab === 'faq'}
            onClick={() => setActiveTab('faq')}
          >
            <HelpCircle size={15} />
            <span>{copy.tabs.faq}</span>
          </button>
        )}

        {isEnabled('feedback') && (
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
        )}

        {isEnabled('newsletter') && (
          <button
            className="rfw-nav-btn"
            data-active={activeTab === 'newsletter'}
            onClick={() => setActiveTab('newsletter')}
          >
            <Mail size={15} />
            <span>{copy.tabs.newsletter}</span>
          </button>
        )}
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
                endpointUrl={endpointUrl}
                onSubmitBug={handleBugSubmit}
                onSubmitSuggestion={handleSuggestionSubmit}
                onVoteSuggestion={onVoteSuggestion}
                onSubmitTicket={handleTicketSubmit}
                onViewTickets={() => setSupportView('tickets')}
                enableCommunityRoadmap={enableCommunityRoadmap}
                content={copy.feedback}
                suggestionsContent={copy.suggestions}
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
