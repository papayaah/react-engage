import React, { useState, useEffect, useMemo } from 'react';
import { SuggestionItem, WidgetUser, EngageWidgetContent } from '../../types';
import { ChevronUp, Plus, Lightbulb, Sparkles, CheckCircle2, Clock, Hammer } from 'lucide-react';
import { DEFAULT_ENGAGE_CONTENT } from '../../content';

interface SuggestionListProps {
  appId: string;
  user?: WidgetUser;
  endpointUrl?: string;
  onVoteSuggestion?: (suggestionId: string, action: 'upvote' | 'unvote') => Promise<void> | void;
  onCreateNew: () => void;
  content?: EngageWidgetContent['feedback'];
}

export const SuggestionList: React.FC<SuggestionListProps> = ({
  appId,
  user,
  endpointUrl,
  onVoteSuggestion,
  onCreateNew,
  content: _content = DEFAULT_ENGAGE_CONTENT.feedback,
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSort, setFilterSort] = useState<'top' | 'recent' | 'roadmap'>('top');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());

  // Get unique user key (user email, user id, or local device identifier)
  const getUserKey = () => {
    if (user?.email) return user.email;
    if (user?.id) return user.id;
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('engage_device_voter_id');
      if (!token) {
        token = `voter_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem('engage_device_voter_id', token);
      }
      return token;
    }
    return 'anonymous';
  };

  const userKey = getUserKey();

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      if (endpointUrl) {
        const res = await fetch(`${endpointUrl}?action=list_suggestions&appId=${appId}&userKey=${encodeURIComponent(userKey)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.log('[Engage] Failed to fetch suggestions from endpoint. Using local state.');
    }

    // Default sample community suggestions if empty
    setSuggestions([
      {
        id: 'sugg_1',
        appId,
        title: 'Dark / Light Mode Scheduled Automation',
        description: 'Auto switch theme based on sunrise/sunset or system OS settings.',
        category: 'ui_ux',
        status: 'planned',
        upvotes: 18,
        hasVoted: false,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'sugg_2',
        appId,
        title: 'Export Trade Review Reports to PDF / Markdown',
        description: 'Allow downloading full journal daily notes and AI trade reviews.',
        category: 'new_feature',
        status: 'in_progress',
        upvotes: 24,
        hasVoted: false,
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
      {
        id: 'sugg_3',
        appId,
        title: 'Custom Hotkeys for Fast Chart Timeframe Switching',
        description: 'Keyboard shortcuts (e.g. 1, 5, 15, D) to quickly switch charts.',
        category: 'ui_ux',
        status: 'under_review',
        upvotes: 9,
        hasVoted: false,
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSuggestions();
  }, [endpointUrl, appId]);

  const handleVote = async (suggestion: SuggestionItem) => {
    if (votingIds.has(suggestion.id)) return;

    const isUnvoting = suggestion.hasVoted;
    const nextAction = isUnvoting ? 'unvote' : 'upvote';
    const delta = isUnvoting ? -1 : 1;

    // Optimistic UI update
    setSuggestions((prev) =>
      prev.map((item) =>
        item.id === suggestion.id
          ? {
              ...item,
              hasVoted: !isUnvoting,
              upvotes: Math.max(0, item.upvotes + delta),
            }
          : item
      )
    );

    setVotingIds((prev) => new Set(prev).add(suggestion.id));

    try {
      if (onVoteSuggestion) {
        await onVoteSuggestion(suggestion.id, nextAction);
      } else if (endpointUrl) {
        await fetch(`${endpointUrl}?action=vote_suggestion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionId: suggestion.id,
            userKey,
            voteAction: nextAction,
          }),
        });
      }
    } catch (e) {
      console.error('[Engage] Failed to submit vote:', e);
      // Revert on failure
      setSuggestions((prev) =>
        prev.map((item) =>
          item.id === suggestion.id
            ? {
                ...item,
                hasVoted: isUnvoting,
                upvotes: Math.max(0, item.upvotes - delta),
              }
            : item
        )
      );
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const filteredSuggestions = useMemo(() => {
    let list = [...suggestions];

    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    if (filterSort === 'top') {
      list.sort((a, b) => b.upvotes - a.upvotes);
    } else if (filterSort === 'recent') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filterSort === 'roadmap') {
      list = list.filter((item) => item.status && item.status !== 'under_review' && item.status !== 'open');
      list.sort((a, b) => b.upvotes - a.upvotes);
    }

    return list;
  }, [suggestions, filterSort, selectedCategory]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return (
          <span className="rfw-status-pill rfw-status-planned" title="Planned for upcoming release">
            <Clock size={11} /> Planned
          </span>
        );
      case 'in_progress':
        return (
          <span className="rfw-status-pill rfw-status-progress" title="Currently being built">
            <Hammer size={11} /> In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="rfw-status-pill rfw-status-completed" title="Feature released">
            <CheckCircle2 size={11} /> Completed
          </span>
        );
      default:
        return (
          <span className="rfw-status-pill rfw-status-review" title="Under community review">
            Under Review
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'ui_ux':
        return 'UI/UX';
      case 'performance':
        return 'Performance';
      case 'integrations':
        return 'Integrations';
      case 'other':
        return 'Other';
      default:
        return 'Feature';
    }
  };

  return (
    <div className="rfw-suggestion-list-container">
      {/* Action Header */}
      <div className="rfw-sugg-header">
        <div>
          <div className="rfw-sugg-title-row">
            <Lightbulb size={17} className="rfw-sugg-icon" />
            <strong style={{ fontSize: 14 }}>Feature Ideas & Roadmap</strong>
          </div>
          <p className="rfw-sugg-subtitle">
            Vote on community suggestions or share your own idea.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="rfw-btn-submit rfw-sugg-create-btn"
        >
          <Plus size={14} />
          <span>New Idea</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="rfw-sugg-tabs">
        <div className="rfw-sugg-sort-group">
          <button
            type="button"
            className={`rfw-sugg-tab ${filterSort === 'top' ? 'active' : ''}`}
            onClick={() => setFilterSort('top')}
          >
            <Sparkles size={12} />
            <span>Top Voted</span>
          </button>
          <button
            type="button"
            className={`rfw-sugg-tab ${filterSort === 'recent' ? 'active' : ''}`}
            onClick={() => setFilterSort('recent')}
          >
            <Clock size={12} />
            <span>Recent</span>
          </button>
          <button
            type="button"
            className={`rfw-sugg-tab ${filterSort === 'roadmap' ? 'active' : ''}`}
            onClick={() => setFilterSort('roadmap')}
          >
            <Hammer size={12} />
            <span>Roadmap</span>
          </button>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rfw-sugg-cat-select"
          aria-label="Filter by category"
        >
          <option value="all">All Topics</option>
          <option value="new_feature">New Features</option>
          <option value="ui_ux">UI / UX</option>
          <option value="performance">Performance</option>
          <option value="integrations">Integrations</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Suggestions Feed */}
      <div className="rfw-sugg-feed">
        {isLoading ? (
          <div className="rfw-sugg-empty">Loading ideas...</div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="rfw-sugg-empty">
            <Lightbulb size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No suggestions found</p>
            <p style={{ fontSize: 12, margin: '4px 0 12px 0', opacity: 0.8 }}>
              Be the first to suggest a new feature!
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="rfw-btn-submit"
              style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}
            >
              <Plus size={13} /> Suggest an Idea
            </button>
          </div>
        ) : (
          filteredSuggestions.map((item) => (
            <div key={item.id} className="rfw-sugg-card">
              {/* Upvote Button */}
              <button
                type="button"
                className={`rfw-upvote-btn ${item.hasVoted ? 'voted' : ''}`}
                onClick={() => handleVote(item)}
                aria-label={`Upvote ${item.title}, currently ${item.upvotes} votes`}
                title={item.hasVoted ? 'Click to remove upvote' : 'Click to upvote'}
              >
                <ChevronUp size={16} className={`rfw-upvote-arrow ${item.hasVoted ? 'voted' : ''}`} />
                <span className="rfw-upvote-count">{item.upvotes}</span>
              </button>

              {/* Content */}
              <div className="rfw-sugg-content">
                <div className="rfw-sugg-title-bar">
                  <h4 className="rfw-sugg-title">{item.title}</h4>
                </div>

                <p className="rfw-sugg-desc">{item.description}</p>

                <div className="rfw-sugg-meta">
                  <span className="rfw-category-badge">{getCategoryLabel(item.category)}</span>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
