import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Clock3, Inbox, RefreshCw } from 'lucide-react';
import { EngageTicket, WidgetUser } from '../../types';

interface MyTicketsTabProps {
  endpointUrl?: string;
  user?: WidgetUser;
  refreshKey?: number;
  onNewRequest?: () => void;
}

const TYPE_LABELS: Record<EngageTicket['type'], string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  ticket: 'Support',
};

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
  onNewRequest,
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
        throw new Error(response.status === 401 ? 'Sign in to view your tickets.' : 'Unable to load your tickets.');
      }

      const data = await response.json();
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your tickets.');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [endpointUrl, userEmail]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTickets(controller.signal);
    return () => controller.abort();
  }, [loadTickets, refreshKey]);

  return (
    <div className="rfw-tickets-panel">
      <div className="rfw-tickets-toolbar">
        <div>
          <strong>My tickets</strong>
          <span>{tickets.length} {tickets.length === 1 ? 'submission' : 'submissions'}</span>
        </div>
        <div className="rfw-ticket-toolbar-actions">
          {onNewRequest ? (
            <button
              type="button"
              className="rfw-icon-btn"
              onClick={onNewRequest}
              aria-label="Back to support form"
              title="Back to support form"
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
              aria-label="Refresh tickets"
              title="Refresh tickets"
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
          <strong>Sign in to view your tickets</strong>
          <span>Tickets submitted while signed in will appear here with their latest status.</span>
        </div>
      ) : isLoading && tickets.length === 0 ? (
        <div className="rfw-empty-state"><span>Loading your tickets…</span></div>
      ) : tickets.length === 0 ? (
        <div className="rfw-empty-state">
          <Inbox size={30} />
          <strong>No tickets yet</strong>
          <span>Your bug reports, suggestions, and support requests will appear here.</span>
        </div>
      ) : (
        <div className="rfw-ticket-list">
          {tickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.id;
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
                      <span className="rfw-type-badge" data-type={ticket.type}>{TYPE_LABELS[ticket.type]}</span>
                      <span className="rfw-status-badge" data-status={ticket.status}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <strong>{ticket.subject || ticket.message.slice(0, 60)}</strong>
                    <span className="rfw-ticket-date"><Clock3 size={12} />{formatDate(ticket.createdAt)}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded ? (
                  <div className="rfw-ticket-detail">
                    <div className="rfw-ticket-reference">Reference: {ticket.id}</div>
                    <p>{ticket.message}</p>
                    <div className="rfw-ticket-reply-note">
                      Support replies are sent to <strong>{userEmail}</strong>. The status here updates when the team responds.
                    </div>
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
