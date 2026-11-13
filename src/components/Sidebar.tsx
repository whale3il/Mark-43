import React, { useState } from 'react';
import {
  LayoutDashboard,
  Landmark,
  ArrowRightLeft,
  CreditCard,
  PieChart,
  Target,
  CalendarCheck,
  FileText,
  ShieldCheck,
  Headphones,
  ExternalLink,
  Layers,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { USER_PROFILE } from '../data/mockData';
import { UserPortalRole } from '../types/support';

export type NavTab =
  | 'dashboard'
  | 'accounts'
  | 'transfers'
  | 'cards'
  | 'analytics'
  | 'goals'
  | 'bills'
  | 'statements'
  | 'security'
  | 'support';

interface SidebarProps {
  portalMode?: UserPortalRole;
  onSelectPortal?: (mode: UserPortalRole) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isDesignMode: boolean;
  setIsDesignMode: (val: boolean) => void;
  onOpenAdvisorModal: () => void;
  supportUnreadCount?: number;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  portalMode = 'CLIENT',
  onSelectPortal,
  activeTab,
  setActiveTab,
  isDesignMode,
  setIsDesignMode,
  onOpenAdvisorModal,
  supportUnreadCount = 0,
  onLogout,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Accounts & Vaults', icon: Landmark },
    { id: 'transfers', label: 'Transfers & Payees', icon: ArrowRightLeft },
    { id: 'cards', label: 'Cards & Controls', icon: CreditCard },
    { id: 'analytics', label: 'Spending Analytics', icon: PieChart },
    { id: 'goals', label: 'Goals & Budgets', icon: Target },
    { id: 'bills', label: 'Scheduled Bills', icon: CalendarCheck },
    { id: 'statements', label: 'Statements & Tax', icon: FileText },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'support', label: 'Support & Concierge', icon: Headphones, badge: supportUnreadCount }
  ];

  const handleSelectClientTab = (tabId: NavTab) => {
    if (portalMode !== 'CLIENT' && onSelectPortal) {
      onSelectPortal('CLIENT');
    }
    setActiveTab(tabId);
    if (isDesignMode) setIsDesignMode(false);
  };

  const handleSelectDesignMode = () => {
    if (portalMode !== 'CLIENT' && onSelectPortal) {
      onSelectPortal('CLIENT');
    }
    setIsDesignMode(!isDesignMode);
  };

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`${
        isExpanded ? 'w-64 px-4' : 'w-[72px] px-2.5'
      } shrink-0 border-r hidden md:flex flex-col justify-between py-4 h-full min-h-0 overflow-y-auto overflow-x-hidden transition-[width,padding] duration-200 ease-out select-none z-20 ${
        isLight
          ? 'border-slate-200 bg-white/95 text-slate-800'
          : 'border-neutral-800/80 bg-neutral-950/90 text-neutral-100'
      }`}
      aria-label="Primary Navigation Sidebar"
    >
      <div className="space-y-5">
        {/* Portfolio Management Section */}
        <div>
          {isExpanded ? (
            <div
              className={`px-3 pb-2 text-[11px] font-mono uppercase tracking-wider whitespace-nowrap ${
                isLight ? 'text-slate-400' : 'text-neutral-500'
              }`}
            >
              Portfolio Management
            </div>
          ) : (
            <div className="pb-2 flex justify-center">
              <span className={`w-6 h-px ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`} />
            </div>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = portalMode === 'CLIENT' && activeTab === item.id && !isDesignMode;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={!isExpanded ? item.label : undefined}
                  onClick={() => handleSelectClientTab(item.id)}
                  className={`w-full flex items-center ${
                    isExpanded ? 'justify-between px-3' : 'justify-center px-0'
                  } py-2.5 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${
                    isActive
                      ? isLight
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-xs'
                        : 'bg-neutral-900 text-neutral-100 border border-neutral-800 shadow-sm'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center ${isExpanded ? 'gap-3 min-w-0' : 'justify-center'}`}>
                    <div className="relative shrink-0">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive
                            ? isLight
                              ? 'text-emerald-700'
                              : 'text-emerald-400'
                            : isLight
                            ? 'text-slate-500'
                            : 'text-neutral-400'
                        }`}
                      />
                      {!isExpanded && item.badge && item.badge > 0 ? (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[9px] font-mono font-bold flex items-center justify-center leading-none">
                          {item.badge}
                        </span>
                      ) : !isExpanded && item.id === 'support' ? (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ) : null}
                    </div>

                    {isExpanded && <span className="truncate whitespace-nowrap">{item.label}</span>}
                  </div>

                  {isExpanded && (
                    <>
                      {item.badge && item.badge > 0 ? (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                            isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-neutral-950'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : item.id === 'support' ? (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      ) : null}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dedicated Support Workspaces */}
        <div className={`pt-2 border-t ${isLight ? 'border-slate-200/80' : 'border-neutral-800/70'}`}>
          {isExpanded && (
            <div
              className={`px-3 pb-2 text-[11px] font-mono uppercase tracking-wider whitespace-nowrap ${
                isLight ? 'text-slate-400' : 'text-neutral-500'
              }`}
            >
              Support Workspaces
            </div>
          )}

          <div className="space-y-1">
            <button
              type="button"
              title={!isExpanded ? 'Staff Desk (/staff)' : undefined}
              onClick={() => onSelectPortal?.('STAFF')}
              className={`w-full flex items-center ${
                isExpanded ? 'justify-between px-3' : 'justify-center px-0'
              } py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                portalMode === 'STAFF'
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
              }`}
            >
              <div className={`flex items-center ${isExpanded ? 'gap-3 min-w-0' : 'justify-center'}`}>
                <Headphones
                  className={`w-4 h-4 shrink-0 ${
                    portalMode === 'STAFF' ? 'text-emerald-400' : isLight ? 'text-slate-500' : 'text-neutral-400'
                  }`}
                />
                {isExpanded && <span className="truncate whitespace-nowrap">Staff Desk (/staff)</span>}
              </div>
              {isExpanded && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                    isLight
                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  5 Desks
                </span>
              )}
            </button>

            <button
              type="button"
              title={!isExpanded ? 'Super Admin (/admin)' : undefined}
              onClick={() => onSelectPortal?.('ADMIN')}
              className={`w-full flex items-center ${
                isExpanded ? 'justify-between px-3' : 'justify-center px-0'
              } py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                portalMode === 'ADMIN'
                  ? isLight
                    ? 'bg-purple-50 text-purple-800 border border-purple-200 font-semibold'
                    : 'bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
              }`}
            >
              <div className={`flex items-center ${isExpanded ? 'gap-3 min-w-0' : 'justify-center'}`}>
                <ShieldAlert
                  className={`w-4 h-4 shrink-0 ${
                    portalMode === 'ADMIN' ? 'text-purple-400' : isLight ? 'text-slate-500' : 'text-neutral-400'
                  }`}
                />
                {isExpanded && <span className="truncate whitespace-nowrap">Super Admin (/admin)</span>}
              </div>
              {isExpanded && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                    isLight
                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  Oversight
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Design System Spec Link */}
        <div className={`pt-2 border-t ${isLight ? 'border-slate-200/80' : 'border-neutral-800/70'}`}>
          {isExpanded && (
            <div
              className={`px-3 pb-2 text-[11px] font-mono uppercase tracking-wider whitespace-nowrap ${
                isLight ? 'text-slate-400' : 'text-neutral-500'
              }`}
            >
              Design & Architecture
            </div>
          )}

          <button
            type="button"
            title={!isExpanded ? 'UI Design Specs & Tokens' : undefined}
            onClick={handleSelectDesignMode}
            className={`w-full flex items-center ${
              isExpanded ? 'justify-between px-3' : 'justify-center px-0'
            } py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              portalMode === 'CLIENT' && isDesignMode
                ? isLight
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
            }`}
          >
            <div className={`flex items-center ${isExpanded ? 'gap-3 min-w-0' : 'justify-center'}`}>
              <Layers className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              {isExpanded && <span className="truncate whitespace-nowrap">UI Design Specs & Tokens</span>}
            </div>
            {isExpanded && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isLight
                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                v2.5
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Section: Relationship Manager Contact Card & Log Out */}
      <div className={`pt-4 mt-4 border-t shrink-0 space-y-3 ${isLight ? 'border-slate-200' : 'border-neutral-800/80'}`}>
        {isExpanded ? (
          <div
            className={`p-3 rounded-xl border text-xs ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-900/70 border-neutral-800/90 text-neutral-200'
            }`}
          >
            <div className={`flex items-center justify-between text-[11px] mb-1.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              <span className="truncate">Private Wealth Partner</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <div className={`font-semibold truncate ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>
              {USER_PROFILE.relationshipManager.name}
            </div>
            <div className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              {USER_PROFILE.relationshipManager.title}
            </div>
            <button
              type="button"
              onClick={onOpenAdvisorModal}
              className={`mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                  : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border-neutral-700/60'
              }`}
            >
              <span>Live Support Desk</span>
              <ExternalLink className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            title={`Live Support Desk (${USER_PROFILE.relationshipManager.name})`}
            onClick={onOpenAdvisorModal}
            className={`w-full flex items-center justify-center py-2.5 rounded-xl border relative cursor-pointer transition-colors ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-emerald-700'
                : 'bg-neutral-900/70 hover:bg-neutral-800 border-neutral-800 text-emerald-400'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span className="absolute top-1.5 right-2.5 flex h-2 w-2 rounded-full bg-emerald-500" />
          </button>
        )}

        {/* Log Out to Return to Sign In / Login */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Log out and return to sign in"
            className={`w-full flex items-center ${
              isExpanded ? 'justify-between px-3.5' : 'justify-center px-0'
            } py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group shadow-xs active:scale-[0.99] border cursor-pointer ${
              isLight
                ? 'text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100/70 border-red-200'
                : 'text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border-red-500/25 hover:border-red-500/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-red-500 group-hover:-translate-x-0.5 transition-transform shrink-0" />
              {isExpanded && <span className="font-semibold tracking-tight whitespace-nowrap">Log Out</span>}
            </div>
            {isExpanded && (
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                  isLight ? 'text-red-700 bg-white border-red-200' : 'text-red-400/80 bg-red-500/10 border-red-500/20'
                }`}
              >
                Sign In
              </span>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
