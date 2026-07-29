import React, { useState } from 'react';
import { TabId, FeedbackWidgetProps } from '../types';
import { FaqTab } from './tabs/FaqTab';
import { FeedbackTab, FeedbackPayload } from './tabs/FeedbackTab';
import { BugReportTab } from './tabs/BugReportTab';
import { SuggestionTab } from './tabs/SuggestionTab';
import { TicketTab } from './tabs/TicketTab';
import { X, HelpCircle, MessageSquare, Bug, Lightbulb, LifeBuoy } from 'lucide-react';

interface FeedbackDrawerProps extends FeedbackWidgetProps {
  onClose: () => void;
  themeMode: 'light' | 'dark';
}

export const FeedbackDrawer: React.FC<FeedbackDrawerProps> = ({
  appId = 'app',
  user,
  faqs,
  enabledTabs = ['faq', 'feedback'],
  defaultTab,
  labels,
  themeMode,
  endpointUrl,
  onSubmitFeedback,
  onSubmitBug,
  onSubmitSuggestion,
  onSubmitTicket,
  onClose,
}) => {
  const initialTab = defaultTab && enabledTabs.includes(defaultTab) ? defaultTab : enabledTabs[0] || 'faq';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleFeedbackSubmit = async (payload: FeedbackPayload) => {
    if (onSubmitFeedback) {
      await onSubmitFeedback(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'feedback', payload);
    } else {
      console.log('[FeedbackWidget] Feedback payload:', payload);
    }
  };

  const handleBugSubmit = async (payload: any) => {
    if (onSubmitBug) {
      await onSubmitBug(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'bug', payload);
    } else {
      console.log('[FeedbackWidget] Bug report payload:', payload);
    }
  };

  const handleSuggestionSubmit = async (payload: any) => {
    if (onSubmitSuggestion) {
      await onSubmitSuggestion(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'suggestion', payload);
    } else {
      console.log('[FeedbackWidget] Suggestion payload:', payload);
    }
  };

  const handleTicketSubmit = async (payload: any) => {
    if (onSubmitTicket) {
      await onSubmitTicket(payload);
    } else if (endpointUrl) {
      const { sendPayloadToEndpoint } = await import('../utils/adapters');
      await sendPayloadToEndpoint(endpointUrl, 'ticket', payload);
    } else {
      console.log('[FeedbackWidget] Ticket payload:', payload);
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

      {/* Navigation tabs */}
      {enabledTabs.length > 1 && (
        <div className="rfw-nav">
          {enabledTabs.includes('faq') && (
            <button
              className="rfw-nav-btn"
              data-active={activeTab === 'faq'}
              onClick={() => setActiveTab('faq')}
            >
              <HelpCircle size={14} />
              <span>{labels?.faqTabTitle || 'FAQ'}</span>
            </button>
          )}

          {enabledTabs.includes('feedback') && (
            <button
              className="rfw-nav-btn"
              data-active={activeTab === 'feedback'}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquare size={14} />
              <span>{labels?.feedbackTabTitle || 'Feedback'}</span>
            </button>
          )}

          {enabledTabs.includes('bug') && (
            <button
              className="rfw-nav-btn"
              data-active={activeTab === 'bug'}
              onClick={() => setActiveTab('bug')}
            >
              <Bug size={14} />
              <span>{labels?.bugTabTitle || 'Report Bug'}</span>
            </button>
          )}

          {enabledTabs.includes('suggestion') && (
            <button
              className="rfw-nav-btn"
              data-active={activeTab === 'suggestion'}
              onClick={() => setActiveTab('suggestion')}
            >
              <Lightbulb size={14} />
              <span>{labels?.suggestionTabTitle || 'Suggest'}</span>
            </button>
          )}

          {enabledTabs.includes('ticket') && (
            <button
              className="rfw-nav-btn"
              data-active={activeTab === 'ticket'}
              onClick={() => setActiveTab('ticket')}
            >
              <LifeBuoy size={14} />
              <span>{labels?.ticketTabTitle || 'Support'}</span>
            </button>
          )}
        </div>
      )}

      {/* Body panel content */}
      <div className="rfw-body">
        {activeTab === 'faq' && <FaqTab faqs={faqs} />}
        {activeTab === 'feedback' && (
          <FeedbackTab
            appId={appId}
            user={user}
            onSubmit={handleFeedbackSubmit}
          />
        )}
        {activeTab === 'bug' && (
          <BugReportTab
            appId={appId}
            user={user}
            themeMode={themeMode}
            onSubmit={handleBugSubmit}
          />
        )}
        {activeTab === 'suggestion' && (
          <SuggestionTab
            appId={appId}
            user={user}
            onSubmit={handleSuggestionSubmit}
          />
        )}
        {activeTab === 'ticket' && (
          <TicketTab
            appId={appId}
            user={user}
            onSubmit={handleTicketSubmit}
          />
        )}
      </div>
    </div>
  );
};
