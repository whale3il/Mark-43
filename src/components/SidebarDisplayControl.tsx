import React, { useState, useCallback } from 'react';
import {
  Check,
  MousePointer,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from 'lucide-react';

export type SidebarDisplayMode = 'expanded' | 'collapsed' | 'hover';

export const SIDEBAR_DISPLAY_OPTIONS: {
  id: SidebarDisplayMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'expanded',
    label: 'Expanded',
    description: 'Always display icons and navigation labels',
    icon: PanelLeftOpen,
  },
  {
    id: 'collapsed',
    label: 'Collapsed',
    description: 'Icons only with tooltips on hover',
    icon: PanelLeftClose,
  },
  {
    id: 'hover',
    label: 'Expand on Hover',
    description: 'Collapsed by default; expands on pointer hover',
    icon: MousePointer,
  },
];

export function readStoredSidebarMode(
  storageKey: string,
  fallback: SidebarDisplayMode = 'expanded',
  legacyCollapsedKey?: string
): SidebarDisplayMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'expanded' || saved === 'collapsed' || saved === 'hover') {
      return saved;
    }
    if (legacyCollapsedKey) {
      const legacy = localStorage.getItem(legacyCollapsedKey);
      if (legacy === 'true') return 'collapsed';
      if (legacy === 'false') return 'expanded';
    }
  } catch {
    // Ignore storage read errors
  }
  return fallback;
}

export function writeStoredSidebarMode(
  storageKey: string,
  mode: SidebarDisplayMode
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore storage write errors
  }
}

interface TooltipState {
  label: string;
  top: number;
  left: number;
}

export function useCollapsedSidebarTooltip(enabled: boolean) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = useCallback(
    (label: string, target: HTMLElement) => {
      if (!enabled) return;
      const rect = target.getBoundingClientRect();
      setTooltip({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
    },
    [enabled]
  );

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip: enabled ? tooltip : null, showTooltip, hideTooltip };
}

export const CollapsedSidebarTooltip: React.FC<{
  tooltip: TooltipState | null;
  isLight: boolean;
}> = ({ tooltip, isLight }) => {
  if (!tooltip) return null;

  return (
    <div
      role="tooltip"
      style={{
        top: `${tooltip.top}px`,
        left: `${tooltip.left}px`,
        transform: 'translateY(-50%)',
      }}
      className={`fixed z-[70] pointer-events-none px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-xl whitespace-nowrap animate-in fade-in duration-100 ${
        isLight
          ? 'bg-slate-900 border-slate-800 text-white'
          : 'bg-neutral-900 border-neutral-700 text-neutral-100'
      }`}
    >
      {tooltip.label}
    </div>
  );
};

interface SidebarDisplayControlProps {
  mode: SidebarDisplayMode;
  onChangeMode: (mode: SidebarDisplayMode) => void;
  collapsed: boolean;
  isLight: boolean;
  isOpen: boolean;
  onSetOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onShowTooltip?: (label: string, target: HTMLElement) => void;
  onHideTooltip?: () => void;
}

export const SidebarDisplayControl: React.FC<SidebarDisplayControlProps> = ({
  mode,
  onChangeMode,
  collapsed,
  isLight,
  isOpen,
  onSetOpen,
  onShowTooltip,
  onHideTooltip,
}) => {
  const activeOption =
    SIDEBAR_DISPLAY_OPTIONS.find((opt) => opt.id === mode) ||
    SIDEBAR_DISPLAY_OPTIONS[0];

  return (
    <div className="pt-1 relative">
      <button
        type="button"
        onClick={() => {
          onHideTooltip?.();
          onSetOpen((prev) => !prev);
        }}
        onMouseEnter={(e) =>
          collapsed &&
          !isOpen &&
          onShowTooltip?.(
            `Sidebar Display: ${activeOption.label}`,
            e.currentTarget
          )
        }
        onMouseLeave={() => onHideTooltip?.()}
        title={
          collapsed
            ? `Sidebar Display: ${activeOption.label}`
            : 'Sidebar display settings'
        }
        aria-label="Sidebar display settings"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`w-full flex items-center ${
          collapsed ? 'justify-center px-0' : 'justify-between px-3'
        } min-h-[38px] py-1.5 rounded-xl text-[11px] font-medium border transition-colors cursor-pointer ${
          isOpen
            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-500'
            : isLight
            ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && (
            <span className="truncate whitespace-nowrap">Sidebar Mode</span>
          )}
        </div>
        {!collapsed && (
          <span className="text-[10px] font-mono text-neutral-500 shrink-0">
            {mode === 'hover'
              ? 'Hover'
              : mode === 'collapsed'
              ? 'Collapsed'
              : 'Expanded'}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => onSetOpen(false)}
          />
          <div
            role="menu"
            aria-label="Sidebar Display Options"
            className={`p-1.5 rounded-xl border shadow-2xl space-y-1 z-50 ${
              collapsed
                ? 'absolute left-full bottom-0 ml-2.5 w-60'
                : 'absolute left-0 bottom-full mb-2 w-full min-w-[220px]'
            } ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Sidebar Display Mode
            </div>
            {SIDEBAR_DISPLAY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    onChangeMode(opt.id);
                    onSetOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-start gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-500 font-semibold'
                      : isLight
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-normal leading-tight mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
