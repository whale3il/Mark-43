import React, { useState, useEffect, useCallback, useRef } from 'react';

interface UseResizablePaneWidthOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  minRemainingWidth?: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function clampWidth(
  value: number,
  minWidth: number,
  maxWidth: number,
  containerWidth?: number,
  minRemainingWidth = 340
): number {
  const effectiveMax =
    containerWidth && containerWidth > minWidth + minRemainingWidth
      ? Math.min(maxWidth, Math.floor(containerWidth - minRemainingWidth))
      : maxWidth;
  return Math.round(
    Math.min(Math.max(effectiveMax, minWidth), Math.max(minWidth, value))
  );
}

export function useResizablePaneWidth({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  minRemainingWidth = 360,
  containerRef,
}: UseResizablePaneWidthOptions) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
          return clampWidth(parsed, minWidth, maxWidth);
        }
      }
    } catch {
      // Ignore storage errors
    }
    return clampWidth(defaultWidth, minWidth, maxWidth);
  });

  const [isDragging, setIsDragging] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const persistWidth = useCallback(
    (nextWidth: number) => {
      try {
        localStorage.setItem(storageKey, String(Math.round(nextWidth)));
      } catch {
        // Ignore storage errors
      }
    },
    [storageKey]
  );

  // Re-clamp cleanly when window or right-side panel changes available container space
  useEffect(() => {
    const syncToContainer = () => {
      const containerWidth = containerRef.current?.getBoundingClientRect().width;
      if (!containerWidth || containerWidth <= 0) return;
      setWidth((prev) =>
        clampWidth(prev, minWidth, maxWidth, containerWidth, minRemainingWidth)
      );
    };

    syncToContainer();
    window.addEventListener('resize', syncToContainer);
    return () => window.removeEventListener('resize', syncToContainer);
  }, [containerRef, minWidth, maxWidth, minRemainingWidth]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();

      const startX = e.clientX;
      const startWidth = widthRef.current;
      const containerWidth = containerRef.current?.getBoundingClientRect().width;

      setIsDragging(true);
      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const next = clampWidth(
          startWidth + deltaX,
          minWidth,
          maxWidth,
          containerWidth,
          minRemainingWidth
        );
        widthRef.current = next;
        setWidth(next);
      };

      const finishDrag = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
        setIsDragging(false);
        persistWidth(widthRef.current);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [containerRef, minWidth, maxWidth, minRemainingWidth, persistWidth]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 32 : 16;
      const containerWidth = containerRef.current?.getBoundingClientRect().width;
      let next: number | null = null;

      if (e.key === 'ArrowLeft') {
        next = clampWidth(
          widthRef.current - step,
          minWidth,
          maxWidth,
          containerWidth,
          minRemainingWidth
        );
      } else if (e.key === 'ArrowRight') {
        next = clampWidth(
          widthRef.current + step,
          minWidth,
          maxWidth,
          containerWidth,
          minRemainingWidth
        );
      } else if (e.key === 'Home') {
        next = minWidth;
      } else if (e.key === 'End') {
        next = clampWidth(
          defaultWidth,
          minWidth,
          maxWidth,
          containerWidth,
          minRemainingWidth
        );
      }

      if (next !== null) {
        e.preventDefault();
        widthRef.current = next;
        setWidth(next);
        persistWidth(next);
      }
    },
    [
      containerRef,
      defaultWidth,
      minWidth,
      maxWidth,
      minRemainingWidth,
      persistWidth,
    ]
  );

  const handleResetWidth = useCallback(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width;
    const next = clampWidth(
      defaultWidth,
      minWidth,
      maxWidth,
      containerWidth,
      minRemainingWidth
    );
    widthRef.current = next;
    setWidth(next);
    persistWidth(next);
  }, [
    containerRef,
    defaultWidth,
    minWidth,
    maxWidth,
    minRemainingWidth,
    persistWidth,
  ]);

  return {
    width,
    isDragging,
    handlePointerDown,
    handleKeyDown,
    handleResetWidth,
  };
}

interface ResizableSplitDividerProps {
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  currentWidth: number;
  minWidth: number;
  maxWidth: number;
  breakpoint?: 'md' | 'lg';
  isLight: boolean;
  ariaLabel?: string;
}

export const ResizableSplitDivider: React.FC<ResizableSplitDividerProps> = ({
  isDragging,
  onPointerDown,
  onKeyDown,
  onDoubleClick,
  currentWidth,
  minWidth,
  maxWidth,
  breakpoint = 'md',
  isLight,
  ariaLabel = 'Resize conversation list and active chat panels',
}) => {
  const responsiveDisplayClass =
    breakpoint === 'lg' ? 'hidden lg:flex' : 'hidden md:flex';

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={currentWidth}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      title="Drag to resize panels · Double-click to reset"
      className={`${responsiveDisplayClass} w-1.5 shrink-0 h-full cursor-col-resize select-none relative items-center justify-center group touch-none focus:outline-none z-10 border-r ${
        isLight
          ? 'border-slate-200 bg-slate-100/60 hover:bg-emerald-500/15'
          : 'border-neutral-800 bg-neutral-950/60 hover:bg-emerald-500/15'
      } ${isDragging ? 'bg-emerald-500/20' : ''} transition-colors`}
    >
      <div
        className={`w-0.5 h-8 rounded-full transition-all ${
          isDragging
            ? 'h-14 bg-emerald-500'
            : isLight
            ? 'bg-slate-300 group-hover:bg-emerald-500 group-focus-visible:bg-emerald-500'
            : 'bg-neutral-700 group-hover:bg-emerald-500 group-focus-visible:bg-emerald-500'
        }`}
      />
    </div>
  );
};
