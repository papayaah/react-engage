import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Clock3, Inbox, RefreshCw } from 'lucide-react';
import { EngageTicket, EngageWidgetContent, WidgetUser } from '../../types';
import { DEFAULT_ENGAGE_CONTENT, interpolateContent } from '../../content';

interface MyTicketsTabProps {
  endpointUrl?: string;
  user?: WidgetUser;
  refreshKey?: number;
  onBack?: () => void;
  content?: EngageWidgetContent['tickets'];
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const MyTicketsTab: React.FC<MyTicketsTabProps> = ({
  endpointUrl,
  user,
  refreshKey = 0,
  onBack,
  content = DEFAULT_ENGAGE_CONTENT.tickets,
}) => {
  const [tickets, setTickets] = useState<EngageTicket[]>([]);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const userEmail = user?.email;

  const loadTickets = useCallback(async (signal?: AbortSignal) => {
    if (!endpointUrl || !userEmail) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${endpointUrl}?action=list_user_tickets`, {
        credentials: 'same-origin',
        signal,
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? content.signInError : content.loadError);
      }

      const data = await response.json();
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setErrorMessage(error instanceof Error ? error.message : content.loadError);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [content.loadError, content.signInError, endpointUrl, userEmail]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTickets(controller.signal);
    return () => controller.abort();
  }, [loadTickets, refreshKey]);

  return (
    <div className="rfw-tickets-panel">
      <div className="rfw-tickets-toolbar">
        <div className="rfw-tickets-toolbar-info">
          <strong>{content.title}</strong>
          <span>{tickets.length} {tickets.length === 1 ? content.submissionSingular : content.submissionPlural}</span>
        </div>
        <div className="rfw-ticket-toolbar-actions">
          {onBack ? (
            <button
              type="button"
              className="rfw-icon-btn"
              onClick={onBack}
              aria-label={content.backLabel}
              title={content.backLabel}
            >
              <ArrowLeft size={14} />
            </button>
          ) : null}
          {userEmail ? (
            <button
              type="button"
              className="rfw-icon-btn"
              onClick={() => void loadTickets()}
              disabled={isLoading}
              aria-label={content.refreshLabel}
              title={content.refreshLabel}
            >
              <RefreshCw size={14} className={isLoading ? 'rfw-spin' : undefined} />
            </button>
          ) : null}
        </div>
      </div>

      {errorMessage ? <div className="rfw-inline-error">{errorMessage}</div> : null}

      {!userEmail ? (
        <div className="rfw-empty-state">
          <Inbox size={30} />
          <strong>{content.signedOutTitle}</strong>
          <span>{content.signedOutMessage}</span>
        </div>
      ) : isLoading && tickets.length === 0 ? (
        <div className="rfw-empty-state"><span>{content.loadingMessage}</span></div>
      ) : tickets.length === 0 ? (
        <div className="rfw-empty-state">
          <Inbox size={30} />
          <strong>{content.emptyTitle}</strong>
          <span>{content.emptyMessage}</span>
        </div>
      ) : (
        <div className="rfw-ticket-list">
          {tickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.id;
            const genericTerms = new Set([
              'bug',
              'bug report',
              'support',
              'support request',
              'ticket',
              'support ticket',
              'suggestion',
              'feature suggestion',
              'feature idea',
              'idea',
              'new feature',
            ]);
            const subject = ticket.subject?.trim();
            const message = ticket.message?.trim();
            const isCustomSubject = Boolean(subject && !genericTerms.has(subject.toLowerCase()));
            const previewBlurb = isCustomSubject ? subject : message || subject || 'No description';

            return (
              <article className="rfw-ticket-card" key={ticket.id} data-expanded={isExpanded}>
                <button
                  type="button"
                  className="rfw-ticket-summary"
                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="rfw-ticket-summary-main">
                    <div className="rfw-ticket-meta-row">
                      <span className="rfw-type-badge" data-type={ticket.type}>{content.typeLabels[ticket.type]}</span>
                      <span className="rfw-status-badge" data-status={ticket.status}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <strong title={previewBlurb}>{previewBlurb}</strong>
                    <span className="rfw-ticket-date"><Clock3 size={12} />{formatDate(ticket.createdAt)}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded ? (
                  <div className="rfw-ticket-detail">
                    <div className="rfw-ticket-reference">{content.referenceLabel}: {ticket.id}</div>
                    {isCustomSubject && message && (
                      <div style={{ fontWeight: 600, color: 'var(--rfw-fg)', marginBottom: 6 }}>
                        {subject}
                      </div>
                    )}
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.message}</p>

                    {ticket.adminReply ? (
                      <div
                        className="rfw-ticket-admin-reply"
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 'var(--rfw-radius-sm, 0px)',
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <strong style={{ fontSize: 12, color: 'var(--rfw-accent)' }}>Response from Support Team</strong>
                          {ticket.repliedAt && (
                            <span style={{ fontSize: 10, color: 'var(--rfw-muted)' }}>{formatDate(ticket.repliedAt)}</span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--rfw-fg)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {ticket.adminReply}
                        </p>
                      </div>
                    ) : (
                      <div className="rfw-ticket-reply-note" style={{ marginTop: 10 }}>
                        {userEmail
                          ? interpolateContent(content.replyNote, { email: userEmail })
                          : 'Our team will review your submission and update the status here.'}
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
