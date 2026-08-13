'use client';

import React, { useState, useEffect } from 'react';
import { FeedbackWidgetProps } from '../types';
import { useFeedbackTheme } from '../hooks/useFeedbackTheme';
import { FeedbackDrawer } from './FeedbackDrawer';
import { MessageSquare, X } from 'lucide-react';

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = (props) => {
  const {
    position = 'bottom-right',
    theme = 'inherit',
    labels,
    accentColor,
    renderTrigger,
    offsetBottom,
    offsetLeft,
    offsetRight,
    mobileCollapse = true,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const resolvedTheme = useFeedbackTheme(theme);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggle = () => setIsOpen((prev) => !prev);

  const customStyle: React.CSSProperties = {
    ...(accentColor ? ({ '--rfw-accent': accentColor } as React.CSSProperties) : {}),
    ...(offsetBottom ? ({ '--rfw-offset-bottom': offsetBottom } as React.CSSProperties) : {}),
    ...(offsetLeft ? ({ '--rfw-offset-left': offsetLeft } as React.CSSProperties) : {}),
    ...(offsetRight ? ({ '--rfw-offset-right': offsetRight } as React.CSSProperties) : {}),
  };

  return (
    <div
      className={`rfw-root rfw-container rfw-position-${position}`}
      data-theme={resolvedTheme}
      data-mobile-collapse={mobileCollapse}
      style={customStyle}
    >
      {isOpen && <FeedbackDrawer {...props} themeMode={resolvedTheme} onClose={() => setIsOpen(false)} />}

      {renderTrigger ? (
        renderTrigger({ isOpen, toggle })
      ) : (
        <button
          className="rfw-launcher-btn"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-label={labels?.launcherTitle || 'Help & Feedback'}
        >
          {isOpen ? <X size={18} /> : <MessageSquare size={18} />}
          <span>{labels?.launcherTitle || 'Help & Feedback'}</span>
        </button>
      )}
    </div>
  );
};
