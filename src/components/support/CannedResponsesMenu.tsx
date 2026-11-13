import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquareQuote, Search, Check, Tag } from 'lucide-react';
import { CannedResponse } from '../../types/support';

interface CannedResponsesMenuProps {
  filterQuery: string;
  templates: CannedResponse[];
  onSelect: (content: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const CannedResponsesMenu: React.FC<CannedResponsesMenuProps> = ({
  filterQuery,
  templates,
  onSelect,
  onClose,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Filter based on what follows the "/"
  const cleanQuery = filterQuery.replace(/^\//, '').toLowerCase().trim();
  const filtered = templates.filter(
    (t) =>
      t.shortcut.toLowerCase().includes(cleanQuery) ||
      t.title.toLowerCase().includes(cleanQuery) ||
      t.content.toLowerCase().includes(cleanQuery) ||
      t.category.toLowerCase().includes(cleanQuery)
  );

  // Keyboard navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].content);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        className={`absolute bottom-full mb-2 left-0 w-80 max-w-[calc(100vw-2rem)] p-3 rounded-xl border shadow-xl text-xs z-50 ${
          isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
        }`}
      >
        No predefined response matching &ldquo;{filterQuery}&rdquo;.
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className={`absolute bottom-full mb-2 left-0 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden z-50 flex flex-col max-h-64 sm:max-h-72 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
      }`}
    >
      {/* Header */}
      <div
        className={`p-2.5 px-3 border-b flex items-center justify-between text-[11px] font-medium ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-neutral-950/80 border-neutral-800 text-neutral-400'
        }`}
      >
        <div className="flex items-center gap-1.5 text-emerald-500">
          <MessageSquareQuote className="w-3.5 h-3.5" />
          <span>Approved Canned Responses</span>
        </div>
        <span className="text-[10px] font-mono opacity-70">
          Navigate: ↑ ↓ · Select: ↵
        </span>
      </div>

      {/* List */}
      <div className="overflow-y-auto divide-y divide-neutral-800/20">
        {filtered.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.content)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`p-3 cursor-pointer transition-all flex flex-col gap-1 ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-50 border-l-2 border-emerald-600'
                    : 'bg-emerald-950/30 border-l-2 border-emerald-500'
                  : isLight
                  ? 'hover:bg-slate-50'
                  : 'hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-emerald-500">
                  {item.shortcut}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                }`}>
                  {item.category}
                </span>
              </div>
              <div className="text-xs font-medium text-neutral-100">{item.title}</div>
              <div
                className={`text-[11px] line-clamp-2 leading-relaxed ${
                  isLight ? 'text-slate-500' : 'text-neutral-400'
                }`}
              >
                {item.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
