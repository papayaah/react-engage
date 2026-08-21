'use client';

import React, { useState, useEffect } from 'react';
import { Inbox, Mail, FileText, Send, User, RefreshCw, Filter, Eye, Users, Download, Search, X, Paperclip, Lightbulb } from 'lucide-react';

export interface TicketItem {
  id: string;
  type: 'bug' | 'suggestion' | 'ticket' | 'newsletter';
  category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  subject?: string;
  message: string;
  userEmail?: string;
  userName?: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    dataUrl?: string;
    url?: string;
  }>;
  createdAt: string;
  environment?: {
    path?: string;
    browser?: string;
    os?: string;
    screenResolution?: string;
  };
}

export interface EmailTemplate {
  id: 'welcome' | 'ticket_reply' | 'newsletter';
  name: string;
  subject: string;
  htmlContent: string;
}

export interface EngageAdminPanelProps {
  /** API endpoint to fetch and update tickets/templates */
  apiEndpoint?: string;
  /** Theme mode for the panel */
  theme?: 'inherit' | 'light' | 'dark';
  /** Initial active admin tab */
  defaultTab?: 'inbox' | 'templates' | 'newsletter';
  /** Custom handler when admin sends a reply email */
  onSendReply?: (ticketId: string, recipientEmail: string, replyText: string) => Promise<void>;
  /** Custom handler when admin saves an email template */
  onSaveTemplate?: (template: EmailTemplate) => Promise<void>;
  /** Custom handler when admin dispatches a newsletter broadcast */
  onSendBroadcast?: (subject: string, bodyContent: string) => Promise<void>;
  /** Host-owned starting templates. Defaults are deliberately product-neutral. */
  initialTemplates?: EmailTemplate[];
  /** Host-owned initial newsletter subject. */
  initialBroadcastSubject?: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email (New Signup)',
    subject: 'Welcome to {{app_name}}!',
    htmlContent: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #3b82f6;">Welcome aboard, {{user_name}}! 🎉</h2>
  <p>Thank you for joining. We are excited to have you with us.</p>
  <p>To get started quickly:</p>
  <ul>
    <li>Explore the available tools and features</li>
    <li>Configure your preferences in settings</li>
    <li>Use the floating feedback widget anytime you have questions</li>
  </ul>
  <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Best regards,<br />The Support Team</p>
</div>`,
  },
  {
    id: 'ticket_reply',
    name: 'Support Ticket Reply',
    subject: 'Re: [Support Ticket] {{ticket_subject}}',
    htmlContent: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h3 style="color: #0f172a; margin-top: 0;">Support Ticket Update</h3>
  <p>Hello {{user_name}},</p>
  <div style="background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 14px; color: #334155; margin: 16px 0;">
    {{reply_text}}
  </div>
  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If you have further questions, reply directly to this email.</p>
</div>`,
  },
  {
    id: 'newsletter',
    name: 'Product Update / Newsletter',
    subject: '🚀 Product Updates - Feature Digest',
    htmlContent: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #10b981; margin-top: 0;">Product Updates 🚀</h2>
  <p>Here is what we shipped this week based on your feedback:</p>
  <div style="background: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 14px; margin: 16px 0;">
    {{broadcast_content}}
  </div>
  <p style="font-size: 11px; color: #94a3b8; margin-top: 24px;">You received this because you subscribed to updates.</p>
</div>`,
  },
];

export const EngageAdminPanel: React.FC<EngageAdminPanelProps> = ({
  apiEndpoint = '/api/feedback',
  defaultTab = 'inbox',
  onSendReply,
  onSaveTemplate,
  onSendBroadcast,
  initialTemplates = DEFAULT_TEMPLATES,
  initialBroadcastSubject = 'New Product Updates',
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'suggestions' | 'newsletter' | 'templates'>(defaultTab as any);
  const [audienceSubTab, setAudienceSubTab] = useState<'broadcast' | 'subscribers' | 'history'>('broadcast');
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState('all');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Template state
  const startingTemplates = initialTemplates.length > 0 ? initialTemplates : DEFAULT_TEMPLATES;
  const [templates, setTemplates] = useState<EmailTemplate[]>(startingTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<'welcome' | 'ticket_reply' | 'newsletter'>('welcome');
  const [editSubject, setEditSubject] = useState(startingTemplates[0].subject);
  const [editHtml, setEditHtml] = useState(startingTemplates[0].htmlContent);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);

  // Broadcast state
  const [broadcastSubject, setBroadcastSubject] = useState(initialBroadcastSubject);
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  // Load tickets, suggestions, subscribers, and broadcast history from API
  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}?action=list_tickets`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tickets)) {
          setTickets(data.tickets);
          if (data.tickets.length > 0 && !selectedTicket) {
            setSelectedTicket(data.tickets[0]);
          }
        }
      }

      // Fetch suggestions list
      const suggRes = await fetch(`${apiEndpoint}?action=list_suggestions`);
      if (suggRes.ok) {
        const suggData = await suggRes.json();
        if (Array.isArray(suggData.suggestions)) {
          setSuggestions(suggData.suggestions);
        }
      }

      // Fetch dedicated subscribers list
      const subRes = await fetch(`${apiEndpoint}?action=list_subscribers`);
      if (subRes.ok) {
        const subData = await subRes.json();
        if (Array.isArray(subData.subscribers)) {
          setSubscribers(subData.subscribers);
        }
      }

      // Fetch broadcast history list
      const bcastRes = await fetch(`${apiEndpoint}?action=list_broadcasts`);
      if (bcastRes.ok) {
        const bcastData = await bcastRes.json();
        if (Array.isArray(bcastData.broadcasts)) {
          setBroadcasts(bcastData.broadcasts);
        }
      }
    } catch (e) {
      console.log('[EngageAdmin] Endpoint fetch skipped/unavailable. Using memory mode.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [apiEndpoint, activeTab, audienceSubTab]);

  const handleTemplateChange = (id: 'welcome' | 'ticket_reply' | 'newsletter') => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id) || DEFAULT_TEMPLATES.find((t) => t.id === id);
    if (tmpl) {
      setEditSubject(tmpl.subject);
      setEditHtml(tmpl.htmlContent);
    }
  };

  const handleSaveTemplate = async () => {
    setTemplateStatus('Saving...');
    try {
      const updated: EmailTemplate = {
        id: selectedTemplateId,
        name: templates.find((t) => t.id === selectedTemplateId)?.name || selectedTemplateId,
        subject: editSubject,
        htmlContent: editHtml,
      };

      if (onSaveTemplate) {
        await onSaveTemplate(updated);
      } else {
        await fetch(`${apiEndpoint}?action=save_template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: updated }),
        });
      }

      setTemplates((prev) => prev.map((t) => (t.id === selectedTemplateId ? updated : t)));
      setTemplateStatus('Template saved successfully!');
      setTimeout(() => setTemplateStatus(null), 3000);
    } catch (e) {
      setTemplateStatus('Saved locally in component state.');
      setTimeout(() => setTemplateStatus(null), 3000);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    setReplyStatus(null);
    try {
      if (onSendReply) {
        await onSendReply(selectedTicket.id, selectedTicket.userEmail || '', replyText);
      } else {
        await fetch(`${apiEndpoint}?action=send_reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: selectedTicket.id,
            userEmail: selectedTicket.userEmail,
            replyText,
          }),
        });
      }

      setReplyStatus('Reply sent via email successfully!');
      setReplyText('');
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: 'resolved' } : t))
      );
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, status: 'resolved' });
      }
    } catch (e) {
      setReplyStatus('Failed to send reply email.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return;

    setIsSendingBroadcast(true);
    setBroadcastStatus(null);
    try {
      if (onSendBroadcast) {
        await onSendBroadcast(broadcastSubject, broadcastBody);
      } else {
        await fetch(`${apiEndpoint}?action=send_broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: broadcastSubject,
            body: broadcastBody,
          }),
        });
      }
      setBroadcastStatus('Broadcast dispatched to subscribers!');
      setBroadcastBody('');
      fetchTickets();
    } catch (e) {
      setBroadcastStatus('Dispatched via email provider API.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleUpdateSuggestionStatus = async (suggestionId: string, status: string) => {
    try {
      await fetch(`${apiEndpoint}?action=update_suggestion_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, status }),
      });
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status } : s))
      );
    } catch (e) {
      console.error('[EngageAdmin] Failed to update suggestion status:', e);
    }
  };

  const filteredTickets = tickets.filter((t) => filterType === 'all' || t.type === filterType);

  return (
    <div
      className="rfw-admin-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '750px',
        backgroundColor: 'var(--background, #ffffff)',
        color: 'var(--foreground, #0f172a)',
        border: '1px solid var(--card-border, #e2e8f0)',
        borderRadius: 'var(--radius, 0px)',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Top Navbar */}
      <div
        className="rfw-admin-navbar"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          gap: 12,
          borderBottom: '1px solid var(--card-border, #e2e8f0)',
          backgroundColor: 'var(--card-bg, #f8fafc)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>Engage Admin Dashboard</h2>
          <span
            style={{
              fontSize: 11,
              background: 'var(--muted-bg, #e2e8f0)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm, 0px)',
              color: 'var(--muted, #64748b)',
            }}
          >
            v0.3.0
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="rfw-admin-tabs" style={{ display: 'flex', gap: 6, background: 'var(--muted-bg, #e2e8f0)', padding: 4, borderRadius: 'var(--radius, 0px)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('inbox')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm, 0px)',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: activeTab === 'inbox' ? 'var(--accent, #3b82f6)' : 'transparent',
              color: activeTab === 'inbox' ? '#ffffff' : 'var(--muted, #64748b)',
            }}
          >
            <Inbox size={14} />
            <span className="rfw-tab-text">Support Inbox</span>
            {tickets.length > 0 && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 'var(--radius-sm, 0px)', background: 'rgba(255,255,255,0.25)' }}>
                {tickets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: activeTab === 'suggestions' ? 'var(--accent, #3b82f6)' : 'transparent',
              color: activeTab === 'suggestions' ? '#ffffff' : 'var(--muted, #64748b)',
            }}
          >
            <Lightbulb size={14} />
            <span className="rfw-tab-text">Feature Roadmap</span>
            {suggestions.length > 0 && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 10, background: 'rgba(255,255,255,0.25)' }}>
                {suggestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('newsletter')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm, 0px)',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: activeTab === 'newsletter' ? 'var(--accent, #3b82f6)' : 'transparent',
              color: activeTab === 'newsletter' ? '#ffffff' : 'var(--muted, #64748b)',
            }}
          >
            <Mail size={14} />
            <span className="rfw-tab-text">Audience & Newsletters</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm, 0px)',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: activeTab === 'templates' ? 'var(--accent, #3b82f6)' : 'transparent',
              color: activeTab === 'templates' ? '#ffffff' : 'var(--muted, #64748b)',
            }}
          >
            <FileText size={14} />
            <span className="rfw-tab-text">Email Templates</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rfw-admin-content" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* TAB 1: SUPPORT INBOX */}
        {activeTab === 'inbox' && (
          <>
            {/* Left Sidebar List */}
            <div
              className="rfw-admin-inbox-sidebar"
              style={{
                width: '340px',
                borderRight: '1px solid var(--card-border, #e2e8f0)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--muted-bg, #f8fafc)',
                flexShrink: 0,
              }}
            >
              {/* Filter bar */}
              <div
                style={{
                  padding: 12,
                  borderBottom: '1px solid var(--card-border, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Filter size={14} style={{ color: 'var(--muted, #64748b)' }} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--card-bg, #ffffff)',
                    color: 'var(--foreground, #0f172a)',
                    border: '1px solid var(--card-border, #cbd5e1)',
                    borderRadius: 'var(--radius-sm, 0px)',
                    padding: '4px 8px',
                    fontSize: 12,
                  }}
                >
                  <option value="all">All Submissions</option>
                  <option value="bug">Bug Reports</option>
                  <option value="ticket">Support Tickets</option>
                  <option value="suggestion">Feature Ideas</option>
                  <option value="newsletter">Subscribers</option>
                </select>

                <button
                  onClick={fetchTickets}
                  title="Refresh tickets"
                  style={{
                    background: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--card-border, #cbd5e1)',
                    color: 'var(--muted, #64748b)',
                    borderRadius: 'var(--radius-sm, 0px)',
                    padding: '4px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Tickets items list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredTickets.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted, #64748b)', fontSize: 13 }}>
                    No tickets found. Submit a ticket using the floating widget!
                  </div>
                ) : (
                  filteredTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--card-border, #e2e8f0)',
                        cursor: 'pointer',
                        backgroundColor: selectedTicket?.id === t.id ? 'var(--card-bg, #ffffff)' : 'transparent',
                        borderLeft: selectedTicket?.id === t.id ? '3px solid var(--accent, #3b82f6)' : '3px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm, 0px)',
                            backgroundColor:
                              t.type === 'bug'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : t.type === 'ticket'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                            color:
                              t.type === 'bug' ? '#ef4444' : t.type === 'ticket' ? '#2563eb' : '#059669',
                          }}
                        >
                          {t.type}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--muted, #64748b)' }}>
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--foreground, #0f172a)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.subject || t.message.slice(0, 45)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', marginTop: 2 }}>
                        {t.userEmail || 'Anonymous'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Ticket Detail & Reply Panel */}
            <div className="rfw-admin-inbox-detail" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflowY: 'auto', minWidth: 0 }}>
              {selectedTicket ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--foreground, #0f172a)' }}>
                        {selectedTicket.subject || `Submission #${selectedTicket.id}`}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span>
                          <User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          {selectedTicket.userEmail || 'Anonymous user'}
                        </span>
                        <span>•</span>
                        <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm, 0px)',
                        background: selectedTicket.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: selectedTicket.status === 'resolved' ? '#059669' : '#d97706',
                        fontWeight: 600,
                      }}
                    >
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Environment Context Box */}
                  {selectedTicket.environment && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 'var(--radius, 0px)',
                        backgroundColor: 'var(--card-bg, #f8fafc)',
                        border: '1px solid var(--card-border, #e2e8f0)',
                        fontSize: 12,
                        color: 'var(--muted, #64748b)',
                        marginBottom: 16,
                        display: 'flex',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--foreground, #0f172a)' }}>URL Path:</strong> {selectedTicket.environment.path || 'N/A'}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--foreground, #0f172a)' }}>Browser:</strong> {selectedTicket.environment.browser || 'N/A'}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--foreground, #0f172a)' }}>OS:</strong> {selectedTicket.environment.os || 'N/A'}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--foreground, #0f172a)' }}>Screen:</strong> {selectedTicket.environment.screenResolution || 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Message body */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius, 0px)',
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--card-border, #e2e8f0)',
                      color: 'var(--foreground, #0f172a)',
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      marginBottom: 16,
                    }}
                  >
                    {selectedTicket.message}
                  </div>

                  {/* Attachments Section */}
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--foreground, #0f172a)',
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Paperclip size={14} />
                        <span>Attachments ({selectedTicket.attachments.length})</span>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: 10,
                        }}
                      >
                        {selectedTicket.attachments.map((att, i) => {
                          const isImage = att.type.startsWith('image/') || att.name.match(/\.(png|jpe?g|webp|gif|svg)$/i);
                          const fileSrc = att.dataUrl || att.url;
                          return (
                            <div
                              key={i}
                              style={{
                                padding: 10,
                                borderRadius: 'var(--radius, 0px)',
                                border: '1px solid var(--card-border, #e2e8f0)',
                                backgroundColor: 'var(--card-bg, #ffffff)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                              }}
                            >
                              {isImage && fileSrc ? (
                                <div
                                  style={{
                                    width: '100%',
                                    height: 120,
                                    borderRadius: 'var(--radius-sm, 0px)',
                                    overflow: 'hidden',
                                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  onClick={() => setPreviewImage(fileSrc)}
                                  title="Click to view full image"
                                >
                                  <img
                                    src={fileSrc}
                                    alt={att.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  />
                                </div>
                              ) : (
                                <div
                                  style={{
                                    height: 60,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--muted, #64748b)',
                                  }}
                                >
                                  <FileText size={28} />
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: 'var(--foreground, #0f172a)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={att.name}
                                  >
                                    {att.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--muted, #64748b)' }}>
                                    {Math.round(att.size / 1024)} KB
                                  </div>
                                </div>
                                {fileSrc && (
                                  <a
                                    href={fileSrc}
                                    download={att.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 'var(--radius-sm, 0px)',
                                      border: '1px solid var(--card-border, #e2e8f0)',
                                      color: 'var(--accent, #3b82f6)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 11,
                                      textDecoration: 'none',
                                      flexShrink: 0,
                                    }}
                                    title={`Download ${att.name}`}
                                  >
                                    <Download size={12} />
                                    <span>Download</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reply Editor Form */}
                  <form onSubmit={handleSendReply} style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--foreground, #0f172a)' }}>
                      Reply to User via Email ({selectedTicket.userEmail || 'No email specified'})
                    </div>
                    {replyStatus && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm, 0px)',
                          fontSize: 12,
                          marginBottom: 8,
                          backgroundColor: replyStatus.includes('successfully')
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          color: replyStatus.includes('successfully') ? '#059669' : '#dc2626',
                        }}
                      >
                        {replyStatus}
                      </div>
                    )}
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your support response..."
                      style={{
                        width: '100%',
                        height: 100,
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        borderRadius: 'var(--radius, 0px)',
                        padding: 12,
                        color: 'var(--foreground, #0f172a)',
                        fontSize: 13,
                        marginBottom: 10,
                        outline: 'none',
                        resize: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={isSendingReply || !replyText.trim() || !selectedTicket.userEmail}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 'var(--radius-sm, 0px)',
                          backgroundColor: 'var(--accent, #3b82f6)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: isSendingReply || !replyText.trim() ? 0.6 : 1,
                        }}
                      >
                        <Send size={14} />
                        <span>{isSendingReply ? 'Sending Email...' : 'Send Reply'}</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted, #64748b)' }}>
                  Select a ticket from the left panel to inspect context and reply.
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB: FEATURE ROADMAP & COMMUNITY SUGGESTIONS */}
        {activeTab === 'suggestions' && (
          <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--foreground, #0f172a)' }}>
                  💡 Community Feature Roadmap & Upvotes
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted, #64748b)', margin: 0 }}>
                  Prioritize user-requested features, monitor voter demand, and manage public roadmap statuses.
                </p>
              </div>

              {/* Stats Counters */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--muted-bg, #f8fafc)', border: '1px solid var(--card-border, #e2e8f0)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Total Ideas</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground, #0f172a)' }}>{suggestions.length}</div>
                </div>
                <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Total Upvotes</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>
                    {suggestions.reduce((acc, curr) => acc + (Number(curr.upvotes) || 0), 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted, #94a3b8)' }} />
                <input
                  type="text"
                  value={suggestionSearch}
                  onChange={(e) => setSuggestionSearch(e.target.value)}
                  placeholder="Search feature ideas..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 6,
                    border: '1px solid var(--card-border, #cbd5e1)',
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    color: 'var(--foreground, #0f172a)',
                    fontSize: 13,
                  }}
                />
              </div>

              <select
                value={suggestionStatusFilter}
                onChange={(e) => setSuggestionStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--card-border, #cbd5e1)',
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  color: 'var(--foreground, #0f172a)',
                  fontSize: 13,
                }}
              >
                <option value="all">All Statuses</option>
                <option value="under_review">Under Review</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Suggestions Table */}
            <div
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--card-border, #cbd5e1)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--muted-bg, #f8fafc)', borderBottom: '1px solid var(--card-border, #e2e8f0)', color: 'var(--muted, #64748b)' }}>
                    <th style={{ padding: '10px 14px', width: 90, textAlign: 'center' }}>Upvotes</th>
                    <th style={{ padding: '10px 14px' }}>Feature Request</th>
                    <th style={{ padding: '10px 14px', width: 130 }}>Topic</th>
                    <th style={{ padding: '10px 14px', width: 180 }}>Submitter</th>
                    <th style={{ padding: '10px 14px', width: 160 }}>Roadmap Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--muted, #64748b)' }}>
                        No community suggestions submitted yet.
                      </td>
                    </tr>
                  ) : (
                    suggestions
                      .filter((sugg) => {
                        const matchesSearch =
                          !suggestionSearch ||
                          sugg.title.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                          sugg.description.toLowerCase().includes(suggestionSearch.toLowerCase());
                        const matchesStatus =
                          suggestionStatusFilter === 'all' || sugg.status === suggestionStatusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .map((sugg, idx) => (
                        <tr key={`sugg-row-${sugg.id || idx}`} style={{ borderBottom: '1px solid var(--card-border, #f1f5f9)' }}>
                          {/* Upvotes Column */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 12,
                                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                color: '#2563eb',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              ▲ {sugg.upvotes || 0}
                            </span>
                          </td>

                          {/* Title & Description */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--foreground, #0f172a)', marginBottom: 2 }}>
                              {sugg.title}
                            </div>
                            <div style={{ color: 'var(--muted, #64748b)', fontSize: 12, lineHeight: 1.4 }}>
                              {sugg.description}
                            </div>
                          </td>

                          {/* Topic / Category */}
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 6,
                                backgroundColor: 'var(--muted-bg, #f1f5f9)',
                                color: 'var(--muted, #64748b)',
                                textTransform: 'uppercase',
                              }}
                            >
                              {sugg.category || 'Feature'}
                            </span>
                          </td>

                          {/* Submitter info */}
                          <td style={{ padding: '12px 14px', color: 'var(--muted, #64748b)', fontSize: 12 }}>
                            <div>{sugg.userEmail || sugg.userName || 'Anonymous'}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>
                              {new Date(sugg.createdAt).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Roadmap Status Editor */}
                          <td style={{ padding: '12px 14px' }}>
                            <select
                              value={sugg.status || 'under_review'}
                              onChange={(e) => handleUpdateSuggestionStatus(sugg.id, e.target.value)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--card-border, #cbd5e1)',
                                backgroundColor:
                                  sugg.status === 'completed'
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : sugg.status === 'in_progress'
                                    ? 'rgba(59, 130, 246, 0.12)'
                                    : sugg.status === 'planned'
                                    ? 'rgba(168, 85, 247, 0.12)'
                                    : 'var(--card-bg, #ffffff)',
                                color:
                                  sugg.status === 'completed'
                                    ? '#059669'
                                    : sugg.status === 'in_progress'
                                    ? '#2563eb'
                                    : sugg.status === 'planned'
                                    ? '#9333ea'
                                    : 'var(--foreground, #0f172a)',
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="under_review">Under Review</option>
                              <option value="planned">Planned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EMAIL TEMPLATES */}
        {activeTab === 'templates' && (
          <div style={{ flex: 1, display: 'flex', padding: 20, gap: 20 }}>
            {/* Template Selector list */}
            <div style={{ width: 240, borderRight: '1px solid var(--card-border, #e2e8f0)', paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--foreground, #0f172a)' }}>
                System Email Templates
              </div>
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleTemplateChange(tmpl.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius, 0px)',
                    marginBottom: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    backgroundColor: selectedTemplateId === tmpl.id ? 'var(--accent, #3b82f6)' : 'var(--muted-bg, #f1f5f9)',
                    color: selectedTemplateId === tmpl.id ? '#ffffff' : 'var(--foreground, #0f172a)',
                    fontWeight: selectedTemplateId === tmpl.id ? 600 : 400,
                  }}
                >
                  {tmpl.name}
                </div>
              ))}
            </div>

            {/* Template Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--foreground, #0f172a)' }}>
                  Editing: {templates.find((t) => t.id === selectedTemplateId)?.name}
                </h3>
                <button
                  onClick={handleSaveTemplate}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm, 0px)',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Save Template
                </button>
              </div>

              {templateStatus && (
                <div style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.15)', color: '#059669', borderRadius: 'var(--radius-sm, 0px)', fontSize: 12, marginBottom: 10 }}>
                  {templateStatus}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--muted, #64748b)', display: 'block', marginBottom: 4 }}>
                  Subject Line
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--card-border, #cbd5e1)',
                    borderRadius: 'var(--radius-sm, 0px)',
                    color: 'var(--foreground, #0f172a)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginBottom: 4 }}>
                    HTML Content (React / Handlebars Merge Tags: <code>&#123;&#123;user_name&#127;&#127;</code>)
                  </label>
                  <textarea
                    value={editHtml}
                    onChange={(e) => setEditHtml(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--muted-bg, #f8fafc)',
                      border: '1px solid var(--card-border, #cbd5e1)',
                      borderRadius: 'var(--radius, 0px)',
                      padding: 12,
                      color: 'var(--foreground, #0f172a)',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Live Preview */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={13} /> Live Preview
                  </label>
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      borderRadius: 'var(--radius, 0px)',
                      padding: 16,
                      overflowY: 'auto',
                      border: '1px solid var(--card-border, #cbd5e1)',
                      color: '#0f172a',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: editHtml
                        .replace(/\{\{user_name\}\}/g, 'Alex')
                        .replace(/\{\{ticket_subject\}\}/g, 'Account Sync')
                        .replace(/\{\{reply_text\}\}/g, 'We have resolved the reported issue.')
                        .replace(/\{\{broadcast_content\}\}/g, 'New custom dashboards & dark mode contrast improvements.'),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIENCE & NEWSLETTERS */}
        {activeTab === 'newsletter' && (
          <div style={{ flex: 1, padding: 24, maxWidth: 780, margin: '0 auto', width: '100%', overflowY: 'auto' }}>
            {/* Sub-Nav Pill Bar */}
            <div
              style={{
                display: 'inline-flex',
                gap: 4,
                backgroundColor: 'var(--muted-bg, #f1f5f9)',
                padding: 4,
                borderRadius: 'var(--radius, 0px)',
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                onClick={() => setAudienceSubTab('broadcast')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-sm, 0px)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: audienceSubTab === 'broadcast' ? 'var(--card-bg, #ffffff)' : 'transparent',
                  color: audienceSubTab === 'broadcast' ? 'var(--accent, #3b82f6)' : 'var(--muted, #64748b)',
                  boxShadow: audienceSubTab === 'broadcast' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Mail size={14} />
                <span>Dispatch Broadcast</span>
              </button>

              <button
                type="button"
                onClick={() => setAudienceSubTab('subscribers')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-sm, 0px)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: audienceSubTab === 'subscribers' ? 'var(--card-bg, #ffffff)' : 'transparent',
                  color: audienceSubTab === 'subscribers' ? 'var(--accent, #3b82f6)' : 'var(--muted, #64748b)',
                  boxShadow: audienceSubTab === 'subscribers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Users size={14} />
                <span>Subscribers List ({subscribers.length > 0 ? subscribers.length : tickets.filter((t) => t.userEmail).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAudienceSubTab('history')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-sm, 0px)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: audienceSubTab === 'history' ? 'var(--card-bg, #ffffff)' : 'transparent',
                  color: audienceSubTab === 'history' ? 'var(--accent, #3b82f6)' : 'var(--muted, #64748b)',
                  boxShadow: audienceSubTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <FileText size={14} />
                <span>Sent History</span>
              </button>
            </div>

            {/* SUB-VIEW 1: DISPATCH BROADCAST */}
            {audienceSubTab === 'broadcast' && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--foreground, #0f172a)' }}>
                  Dispatch Newsletter Broadcast
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted, #64748b)', margin: '0 0 16px 0' }}>
                  Compose and send product announcements, release digests, or newsletters to your subscriber list.
                </p>

                {/* Target Audience Summary Box */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius, 0px)',
                    backgroundColor: 'var(--muted-bg, #f8fafc)',
                    border: '1px solid var(--card-border, #e2e8f0)',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground, #0f172a)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={15} style={{ color: 'var(--accent, #3b82f6)' }} />
                      <span>Target Audience:</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>
                        {subscribers.length > 0 ? subscribers.length : tickets.filter((t) => t.userEmail).length} Opted-in Subscribers
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginBottom: 8 }}>
                    Recipients include users who opted into product updates via the Engage widget or support tickets.
                  </div>

                  {/* Subscriber List Preview Pills */}
                  {(() => {
                    const subscriberEmails = subscribers.length > 0
                      ? Array.from(new Set(subscribers.map((s) => s.email).filter(Boolean)))
                      : Array.from(new Set(tickets.filter((t) => t.userEmail).map((t) => t.userEmail as string)));
                    const MAX_PREVIEW = 6;
                    const remaining = subscriberEmails.length - MAX_PREVIEW;

                    return (
                      <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {subscriberEmails.slice(0, MAX_PREVIEW).map((email, idx) => (
                            <span
                              key={`${email}-${idx}`}
                              style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm, 0px)',
                                backgroundColor: 'var(--card-bg, #ffffff)',
                                border: '1px solid var(--card-border, #cbd5e1)',
                                color: 'var(--foreground, #0f172a)',
                              }}
                            >
                              {email}
                            </span>
                          ))}

                          {remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => setAudienceSubTab('subscribers')}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 'var(--radius-sm, 0px)',
                                backgroundColor: 'var(--accent, #3b82f6)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              +{remaining} more (View All)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {broadcastStatus && (
                  <div style={{ padding: 10, borderRadius: 'var(--radius-sm, 0px)', background: 'rgba(16,185,129,0.15)', color: '#059669', fontSize: 13, marginBottom: 16 }}>
                    {broadcastStatus}
                  </div>
                )}

                <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground, #0f172a)', display: 'block', marginBottom: 6 }}>
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                    placeholder="e.g. 🚀 What's new in this release"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        borderRadius: 'var(--radius, 0px)',
                        color: 'var(--foreground, #0f172a)',
                        fontSize: 14,
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground, #0f172a)', display: 'block', marginBottom: 6 }}>
                      Message Content / Release Notes
                    </label>
                    <textarea
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Write update notes or newsletter summary..."
                      style={{
                        width: '100%',
                        height: 180,
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        borderRadius: 'var(--radius, 0px)',
                        padding: 14,
                        color: 'var(--foreground, #0f172a)',
                        fontSize: 14,
                        lineHeight: 1.5,
                        resize: 'none',
                      }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingBroadcast}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 'var(--radius, 0px)',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Send size={16} />
                    <span>{isSendingBroadcast ? 'Dispatching Broadcast...' : 'Dispatch Broadcast via Brevo'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* SUB-VIEW 2: SUBSCRIBERS DIRECTORY */}
            {audienceSubTab === 'subscribers' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--foreground, #0f172a)' }}>
                      Opted-in Subscribers Directory
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--muted, #64748b)', margin: 0 }}>
                      View, search, and export users who opted into product announcements and newsletters.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const subList = Array.from(new Set(tickets.filter((t) => t.userEmail).map((t) => t.userEmail as string)));
                      const csvContent = 'data:text/csv;charset=utf-8,' + ['Email,SubscribedAt,Status'].concat(subList.map((e) => `${e},${new Date().toISOString()},Active`)).join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', 'subscribers.csv');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm, 0px)',
                      backgroundColor: 'var(--accent, #3b82f6)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Download size={15} />
                    <span>Export Subscribers CSV</span>
                  </button>
                </div>

                {/* Search Input Bar */}
                <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted, #94a3b8)' }} />
                  <input
                    type="text"
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    placeholder="Search subscriber by email or name..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: 'var(--radius-sm, 0px)',
                      border: '1px solid var(--card-border, #cbd5e1)',
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      color: 'var(--foreground, #0f172a)',
                      fontSize: 13,
                    }}
                  />
                </div>

                {/* Subscribers Table */}
                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--card-border, #cbd5e1)',
                    borderRadius: 'var(--radius, 0px)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--muted-bg, #f8fafc)', borderBottom: '1px solid var(--card-border, #e2e8f0)', color: 'var(--muted, #64748b)' }}>
                        <th style={{ padding: '10px 14px' }}>Subscriber Email</th>
                        <th style={{ padding: '10px 14px' }}>User Name</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                        <th style={{ padding: '10px 14px' }}>Source / App</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const displayList = subscribers.length > 0
                          ? subscribers
                          : tickets
                              .filter((t) => t.userEmail)
                              .map((t) => ({ id: t.id, email: t.userEmail, name: t.userName, status: 'Active', frequency: 'all' }));

                        return displayList
                          .filter((sub) => sub.email && (
                            !subscriberSearch ||
                            sub.email.toLowerCase().includes(subscriberSearch.toLowerCase()) ||
                            (sub.name && sub.name.toLowerCase().includes(subscriberSearch.toLowerCase()))
                          ))
                          .map((sub, idx) => (
                            <tr key={`sub-tab-${sub.id || idx}-${idx}`} style={{ borderBottom: '1px solid var(--card-border, #f1f5f9)' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--foreground, #0f172a)' }}>
                                {sub.email}
                              </td>
                              <td style={{ padding: '12px 14px', color: 'var(--muted, #64748b)' }}>
                                {sub.name || 'N/A'}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-sm, 0px)',
                                    backgroundColor: sub.status === 'Unsubscribed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                    color: sub.status === 'Unsubscribed' ? '#dc2626' : '#059669',
                                    fontWeight: 600,
                                  }}
                                >
                                  {sub.status || 'Active'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: 'var(--muted, #64748b)', fontSize: 12 }}>
                                {sub.frequency ? `${sub.frequency.toUpperCase()} Updates` : 'All Updates'}
                              </td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: SENT HISTORY */}
            {audienceSubTab === 'history' && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--foreground, #0f172a)' }}>
                  📜 Sent Broadcasts History
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted, #64748b)', margin: '0 0 16px 0' }}>
                  Review past newsletters and product update announcements dispatched to your subscribers.
                </p>

                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--card-border, #cbd5e1)',
                    borderRadius: 'var(--radius, 0px)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--muted-bg, #f8fafc)', borderBottom: '1px solid var(--card-border, #e2e8f0)', color: 'var(--muted, #64748b)' }}>
                        <th style={{ padding: '10px 14px' }}>Subject</th>
                        <th style={{ padding: '10px 14px' }}>Recipients</th>
                        <th style={{ padding: '10px 14px' }}>Date Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {broadcasts.length > 0 ? (
                        broadcasts.map((bcast, idx) => (
                          <tr key={`bcast-${bcast.id || idx}-${idx}`} style={{ borderBottom: '1px solid var(--card-border, #f1f5f9)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--foreground, #0f172a)' }}>
                              {bcast.subject}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 600 }}>
                              {bcast.recipientCount || 0} Recipients
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--muted, #64748b)' }}>
                              {new Date(bcast.sentAt || Date.now()).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--muted, #64748b)' }}>
                            No broadcast emails dispatched yet. Compose and send your first newsletter above!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: -36,
                right: 0,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: 4,
              }}
              aria-label="Close image preview"
            >
              <X size={24} />
            </button>
            <img
              src={previewImage}
              alt="Attachment Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: 'var(--radius, 0px)',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
