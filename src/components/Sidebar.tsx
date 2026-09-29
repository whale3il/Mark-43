import React from 'react';
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
  LogOut
} from 'lucide-react';
import { USER_PROFILE } from '../data/mockData';

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
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Accounts & Vaults', icon: Landmark },
    { id: 'transfers', label: 'Transfers & Payees', icon: ArrowRightLeft },
    { id: 'cards', label: 'Cards & Controls', icon: CreditCard },
    { id: 'analytics', label: 'Spending Analytics', icon: PieChart },
    { id: 'goals', label: 'Goals & Budgets', icon: Target },
    { id: 'bills', label: 'Scheduled Bills', icon: CalendarCheck },
    { id: 'statements', label: 'Statements & Tax', icon: FileText },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'support', label: 'Support & Concierge', icon: Headphones, badge: supportUnreadCount },
  ];

  return (
    <aside className={`w-64 shrink-0 border-r flex flex-col justify-between p-4 hidden md:flex h-full overflow-y-auto transition-colors ${
      isLight ? 'border-slate-200 bg-white/95 text-slate-800' : 'border-neutral-800/80 bg-neutral-950/60 text-neutral-100'
    }`}>
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className={`px-3 pb-2 text-[11px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>
            Portfolio Management
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !isDesignMode;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isDesignMode) setIsDesignMode(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? isLight
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-xs'
                        : 'bg-neutral-900 text-neutral-100 border border-neutral-800 shadow-sm'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-slate-400' : 'text-neutral-400')}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-neutral-950'
                    }`}>
                      {item.badge}
                    </span>
                  ) : item.id === 'support' ? (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Design System Spec Link */}
        <div>
          <div className={`px-3 pb-2 text-[11px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>
            Design & Architecture
          </div>
          <button
            onClick={() => setIsDesignMode(!isDesignMode)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isDesignMode
                ? isLight
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              <span>UI Design Specs & Tokens</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
            }`}>
              v2.5
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Section: Relationship Manager Contact Card & Log Out */}
      <div className={`pt-4 border-t shrink-0 space-y-3 ${isLight ? 'border-slate-200' : 'border-neutral-800/80'}`}>
        <div className={`p-3 rounded-xl border text-xs ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-900/70 border-neutral-800/90 text-neutral-200'
        }`}>
          <div className={`flex items-center justify-between text-[11px] mb-1.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
            <span>Private Wealth Partner</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>{USER_PROFILE.relationshipManager.name}</div>
          <div className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>{USER_PROFILE.relationshipManager.title}</div>
          <button
            onClick={onOpenAdvisorModal}
            className={`mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border-neutral-700/60'
            }`}
          >
            <span>Live Support Desk</span>
            <ExternalLink className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
          </button>
        </div>

        {/* Log Out to Return to Sign In / Login */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Log out and return to sign in"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group shadow-xs active:scale-[0.99] border ${
              isLight
                ? 'text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100/70 border-red-200'
                : 'text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border-red-500/25 hover:border-red-500/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-red-500 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-semibold tracking-tight">Log Out</span>
            </div>
            <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              isLight ? 'text-red-700 bg-white border-red-200' : 'text-red-400/80 bg-red-500/10 border-red-500/20'
            }`}>
              Sign In
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
