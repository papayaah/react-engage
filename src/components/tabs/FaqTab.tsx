import React, { useState, useMemo } from 'react';
import { EngageWidgetContent, FaqItem } from '../../types';
import { Search, ChevronDown, ChevronUp, ExternalLink, HelpCircle } from 'lucide-react';
import { DEFAULT_ENGAGE_CONTENT } from '../../content';

interface FaqTabProps {
  faqs?: FaqItem[];
  content?: EngageWidgetContent['faq'];
}

export const FaqTab: React.FC<FaqTabProps> = ({
  faqs,
  content = DEFAULT_ENGAGE_CONTENT.faq,
}) => {
  const items = faqs ?? content.items;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="rfw-field" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--rfw-muted)',
            }}
          />
          <input
            type="text"
            className="rfw-input"
            style={{ paddingLeft: 36 }}
            placeholder={content.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredFaqs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--rfw-muted)' }}>
            <HelpCircle size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: 14 }}>{content.emptyMessage}</p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className="rfw-faq-item"
                onClick={() => setExpandedId(isExpanded ? null : faq.id)}
              >
                <div className="rfw-faq-question">
                  <span>{faq.question}</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {isExpanded && (
                  <div className="rfw-faq-answer">
                    <p style={{ margin: '0 0 8px 0' }}>{faq.answer}</p>
                    {faq.category && <span className="rfw-badge">{faq.category}</span>}
                    {faq.externalUrl && (
                      <a
                        href={faq.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginLeft: 10,
                          fontSize: 12,
                          color: 'var(--rfw-accent)',
                          textDecoration: 'none',
                        }}
                      >
                        {content.readMoreLabel} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
