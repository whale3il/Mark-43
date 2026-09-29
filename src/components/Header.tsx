import React, { useState } from 'react';
import {
  Bell,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Lock,
  Compass,
  Sun,
  Moon,
  Headphones,
  MessageSquare,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { BankNotification, CurrencyCode } from '../types/banking';
import { AuthUser } from '../types/auth';
import { USER_PROFILE } from '../data/mockData';

interface HeaderProps {
  maskBalance: boolean;
  setMaskBalance: (val: boolean | ((prev: boolean) => boolean)) => void;
  isDesignMode: boolean;
  setIsDesignMode: (val: boolean) => void;
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  notifications: BankNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<BankNotification[]>>;
  onOpenTransfer: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onNavigateSupport?: () => void;
  supportUnreadCount?: number;
  user?: AuthUser | null;
  onLogout?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  maskBalance,
  setMaskBalance,
  isDesignMode,
  setIsDesignMode,
  currency,
  setCurrency,
  notifications,
  setNotifications,
  onOpenTransfer,
  theme,
  toggleTheme,
  onNavigateSupport,
  supportUnreadCount = 0,
  user,
  onLogout,
  onOpenProfile
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const activeUser = user || {
    name: USER_PROFILE.name,
    email: USER_PROFILE.email,
    clientTier: 'Sovereign Tier',
    avatarUrl: USER_PROFILE.avatarUrl,
    relationshipManager: USER_PROFILE.relationshipManager
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markSingleAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const filteredNotifs = notifications.filter(n => notifFilter === 'all' || !n.read);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-neutral-800/80 bg-neutral-950/90 px-4 md:px-8 backdrop-blur-md transition-colors">
      {/* Brand & Wordmark */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 shadow-inner">
            <span className="text-base font-bold tracking-wider text-emerald-400 font-mono">AV</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-neutral-100 font-sans">
                Aureus Wealth
              </span>
              <span className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase">
                Private Bank
              </span>
            </div>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="hidden lg:flex items-center gap-1 p-0.5 rounded-md bg-neutral-900/90 border border-neutral-800 text-xs">
          {(['USD', 'EUR', 'GBP', 'CHF', 'NGN'] as CurrencyCode[]).map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                currency === curr
                  ? 'bg-neutral-800 text-neutral-100 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Center / Right Main Navigation Elements */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Dedicated Support Button in Main Nav */}
        <button
          onClick={onNavigateSupport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-850 hover:border-neutral-700 transition-all shadow-xs relative"
          title="Open Dedicated Customer Support & Real-Time Desk"
        >
          <div className="relative">
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="hidden sm:inline">Live Support</span>
          {supportUnreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500 text-neutral-950 font-bold leading-tight">
              {supportUnreadCount}
            </span>
          )}
        </button>

        {/* Theme Switcher Button (Dark / Light) */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 p-2 rounded-lg border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-850 hover:border-neutral-700 transition-all"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-sky-500 transition-transform duration-300 -rotate-12 hover:rotate-0" />
          )}
          <span className="sr-only">Toggle Theme</span>
        </button>

        {/* Design System & Specs Switcher Button */}
        <button
          onClick={() => setIsDesignMode(!isDesignMode)}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isDesignMode
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm'
              : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-850 hover:text-neutral-100'
          }`}
          title="Toggle between Interactive Banking Application and Design System Specifications"
        >
          {isDesignMode ? <Compass className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-neutral-400" />}
          <span>
            {isDesignMode ? 'Application View' : 'Design Spec Mode'}
          </span>
        </button>

        {/* Balance Privacy Toggle */}
        <button
          onClick={() => setMaskBalance(prev => !prev)}
          className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
          title={maskBalance ? "Reveal Balances" : "Disguise Balances"}
          aria-label={maskBalance ? "Reveal Balances" : "Disguise Balances"}
        >
          {maskBalance ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Quick Send Action */}
        <button
          onClick={onOpenTransfer}
          className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-medium text-xs hover:bg-emerald-400 transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Wire</span>
        </button>

        {/* Notification Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur-xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-100">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNotifFilter(notifFilter === 'all' ? 'unread' : 'all')}
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    {notifFilter === 'all' ? 'Unread only' : 'Show all'}
                  </button>
                  <span className="text-neutral-700">·</span>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Mark read
                  </button>
                </div>
              </div>

              <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                {filteredNotifs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No unread security or transaction alerts.
                  </div>
                ) : (
                  filteredNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markSingleAsRead(n.id)}
                      className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        n.read
                          ? 'border-neutral-800/50 bg-neutral-900/40 text-neutral-400'
                          : 'border-neutral-700/60 bg-neutral-800/40 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {n.type === 'security' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          {n.type === 'transaction' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {n.type === 'yield' && <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          {n.type === 'system' && <AlertCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                          <span className="text-xs font-medium text-neutral-100">{n.title}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">{n.timestamp}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
          >
            <img
              src={activeUser.avatarUrl}
              alt={activeUser.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-neutral-700"
            />
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-neutral-200 leading-none">{activeUser.name}</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{activeUser.clientTier || 'Sovereign Tier'}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-neutral-800 bg-neutral-900/95 p-3 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in">
              <div className="p-2 border-b border-neutral-800">
                <div className="text-xs font-semibold text-neutral-100">{activeUser.name}</div>
                <div className="text-xs text-neutral-400 truncate">{activeUser.email}</div>
                <div className="mt-1.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> NIBSS & Hardware Protected
                </div>
              </div>
              <div className="py-2 space-y-1 text-xs text-neutral-300">
                <div className="px-2 py-1 flex items-center justify-between text-neutral-400">
                  <span>Client Tier</span>
                  <span className="font-mono text-emerald-400 text-[11px]">Private Wealth</span>
                </div>
                <div className="px-2 py-1 flex items-center justify-between text-neutral-400">
                  <span>Dedicated Advisor</span>
                  <span className="text-neutral-200 text-xs truncate max-w-[120px]">{activeUser.relationshipManager.name}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-800 space-y-1">
                {onOpenProfile && (
                  <button
                    onClick={() => {
                      onOpenProfile();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-200 hover:bg-neutral-800 transition-colors flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Client Profile & Limits</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onNavigateSupport?.();
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-emerald-400 hover:bg-neutral-800 transition-colors flex items-center gap-2"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Customer Support Desk</span>
                </button>
                <button
                  onClick={() => {
                    setIsDesignMode(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  View Design Tokens & Specifications
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 pt-1 border-t border-neutral-800/80 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Sign Out / Lock Session</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
