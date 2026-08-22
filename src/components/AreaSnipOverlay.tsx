import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toCanvas } from 'html-to-image';
import { Attachment } from '../types';
import { Crop, X, Loader2 } from 'lucide-react';

interface AreaSnipOverlayProps {
  onCapture: (attachment: Attachment) => void;
  onCancel: () => void;
}

export const AreaSnipOverlay: React.FC<AreaSnipOverlayProps> = ({ onCapture, onCancel }) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const rect = React.useMemo(() => {
    if (!startPos || !currentPos) return null;
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    return { x, y, width, height };
  }, [startPos, currentPos]);

  // Handle ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Hide the widget (launcher + drawer) for the duration of the capture. Otherwise
  // it stays on top of the page during selection — full-screen on mobile, so the
  // user can't see or reach the area they want — and would land in the screenshot.
  useEffect(() => {
    document.body.classList.add('rfw-snip-capturing');
    return () => document.body.classList.remove('rfw-snip-capturing');
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isProcessing) return;
    if ((e.target as HTMLElement).closest('.rfw-snip-toolbar')) return;

    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setIsSelecting(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting || isProcessing) return;
      setCurrentPos({ x: e.clientX, y: e.clientY });
    },
    [isSelecting, isProcessing]
  );

  const performCapture = useCallback(
    async (selectionRect: { x: number; y: number; width: number; height: number }) => {
      setIsProcessing(true);

      // Hide this overlay during the actual canvas capture
      if (overlayRef.current) {
        overlayRef.current.style.display = 'none';
      }

      try {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const fullCanvas = await toCanvas(document.body, {
          pixelRatio,
          filter: (node) => {
            if (node instanceof HTMLElement) {
              return (
                !node.classList?.contains('rfw-container') &&
                !node.classList?.contains('rfw-snip-overlay')
              );
            }
            return true;
          },
        });

        // Crop the full canvas to the user's selected area
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = selectionRect.width * pixelRatio;
        cropCanvas.height = selectionRect.height * pixelRatio;
        const ctx = cropCanvas.getContext('2d');
        if (ctx) {
          const sx = (selectionRect.x + window.scrollX) * pixelRatio;
          const sy = (selectionRect.y + window.scrollY) * pixelRatio;
          const sWidth = selectionRect.width * pixelRatio;
          const sHeight = selectionRect.height * pixelRatio;

          ctx.drawImage(
            fullCanvas,
            sx,
            sy,
            sWidth,
            sHeight,
            0,
            0,
            cropCanvas.width,
            cropCanvas.height
          );
        }

        const dataUrl = cropCanvas.toDataURL('image/png');
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const fileName = `snip-${timeStr}.png`;

        onCapture({
          name: fileName,
          type: 'image/png',
          size: Math.round((dataUrl.length * 3) / 4),
          dataUrl,
        });
      } catch (err) {
        console.error('[ReactEngage] Snip capture error:', err);
        onCancel();
      }
    },
    [onCapture, onCancel]
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || isProcessing) return;
    setIsSelecting(false);

    if (rect && rect.width >= 20 && rect.height >= 20) {
      void performCapture(rect);
    } else {
      setStartPos(null);
      setCurrentPos(null);
    }
  }, [isSelecting, isProcessing, rect, performCapture]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="rfw-snip-overlay"
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        cursor: isProcessing ? 'wait' : 'crosshair',
        userSelect: 'none',
      }}
    >
      {/* Top Helper Toolbar */}
      <div className="rfw-snip-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
          {isProcessing ? (
            <>
              <Loader2 size={16} className="rfw-spin" />
              <span>Capturing selected area...</span>
            </>
          ) : (
            <>
              <Crop size={16} />
              <span>Click and drag to select an area on the page</span>
            </>
          )}
        </div>
        {!isProcessing && (
          <button
            type="button"
            className="rfw-snip-cancel-btn"
            onClick={onCancel}
            title="Cancel area capture (ESC)"
          >
            <X size={14} />
            <span>Cancel (ESC)</span>
          </button>
        )}
      </div>

      {/* Dimmed backdrop with cutout for the selection rect */}
      {rect && rect.width > 0 && rect.height > 0 && (
        <div
          className="rfw-snip-selection"
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
            border: '2px dashed #3b82f6',
            borderRadius: 'var(--rfw-radius-sm, 0px)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: -24,
              right: 0,
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 'var(--rfw-radius-sm, 0px)',
              whiteSpace: 'nowrap',
            }}
          >
            {Math.round(rect.width)} × {Math.round(rect.height)} px
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
