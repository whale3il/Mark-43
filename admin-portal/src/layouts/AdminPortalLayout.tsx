import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Eye,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  AdminNavSection,
  AdminProfile,
  AdminSidebarMode,
} from '../types/admin.types';
import { AdminRealtimeStatus } from '../services/adminAblyService';
import {
  CollapsedSidebarTooltip,
  SidebarDisplayControl,
  useCollapsedSidebarTooltip,
} from '@/src/components/SidebarDisplayControl';

export interface AdminPreviewBannerInfo {
  active: boolean;
  isAuthenticated: boolean;
  sources: string[];
  reason?: string;
  onRetryLive: () => void;
  onReturnToSignIn?: () => void;
}

interface AdminPortalLayoutProps {
  admin: AdminProfile;
  activeSection: AdminNavSection;
  onSelectSection: (section: AdminNavSection) => void;
  onSignOut: () => Promise<void>;
  sidebarMode: AdminSidebarMode;
  onChangeSidebarMode: (mode: AdminSidebarMode) => void;
  escalationsCount: number;
  waitingQueueCount: number;
  realtimeStatus: AdminRealtimeStatus;
  previewInfo?: AdminPreviewBannerInfo;
  theme: 'dark' | 'light';
  children: React.ReactNode;
}

export const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({
  admin,
  activeSection,
  onSelectSection,
  onSignOut,
  sidebarMode,
  onChangeSidebarMode,
  escalationsCount,
  waitingQueueCount,
  realtimeStatus,
  previewInfo,
  theme,
  children,
}) => {
  const isLight = theme === 'light';
  const [isHovered, setIsHovered] = useState(false);
  const [sidebarPopoverOpen, setSidebarPopoverOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isDesktopCollapsed =
    sidebarMode === 'collapsed' ||
    (sidebarMode === 'hover' && !isHovered && !sidebarPopoverOpen);

  const { tooltip, showTooltip, hideTooltip } = useCollapsedSidebarTooltip(
    sidebarMode === 'collapsed' && !sidebarPopoverOpen
  );

  const handleSignOutClick = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const primaryNav: {
    id: AdminNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: 'amber' | 'neutral';
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff Management', icon: Users },
    {
      id: 'monitoring',
      label: 'Support Monitoring',
      icon: Eye,
      badge: waitingQueueCount,
      badgeTone: 'amber',
    },
    {
      id: 'tickets',
      label: 'Ticket Management',
      icon: FileText,
      badge: escalationsCount,
      badgeTone: 'neutral',
    },
  ];

  const sectionTitleMap: Record<AdminNavSection, string> = {
    overview: 'Overview',
    staff: 'Staff Management',
    monitoring: 'Support Monitoring',
    tickets: 'Ticket Management',
    settings: 'Settings',
  };

  const renderSidebarContent = (
    collapsed: boolean,
    isMobile: boolean,
    onItemClick?: () => void
  ) => (
    <div className="flex flex-col h-full justify-between min-h-0">
      {/* Top: Brand + Admin Identity + Primary Navigation */}
      <div className="space-y-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-start'
          } gap-2.5 px-1`}
        >
          <div
            title={collapsed ? 'AUREUS ADMIN' : undefined}
            onMouseEnter={(e) =>
              collapsed && showTooltip('AUREUS ADMIN', e.currentTarget)
            }
            onMouseLeave={hideTooltip}
            className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-wider uppercase truncate">
                AUREUS ADMIN
              </div>
              <div className="text-[11px] font-mono text-neutral-500 truncate">
                Operations Command
              </div>
            </div>
          )}
        </div>

        {/* Authenticated Administrator Card */}
        <div
          title={
            collapsed
              ? `${admin.name} · ${admin.role} · ${admin.accessLevel}`
              : undefined
          }
          onMouseEnter={(e) =>
            collapsed &&
            showTooltip(
              `${admin.name} · ${admin.role} · ${admin.accessLevel}`,
              e.currentTarget
            )
          }
          onMouseLeave={hideTooltip}
          className={`rounded-xl border transition-colors ${
            collapsed ? 'p-2 flex flex-col items-center' : 'p-3'
          } ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-neutral-900/70 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0">
              {admin.initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate">{admin.name}</div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {admin.role}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="mt-2.5 pt-2 border-t border-neutral-800/40 flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-emerald-500 truncate">
                {admin.accessLevel}
              </span>
            </div>
          )}
        </div>

        {/* Primary Navigation Links */}
        <nav aria-label="Admin Portal Navigation" className="space-y-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                onMouseEnter={(e) =>
                  collapsed && showTooltip(item.label, e.currentTarget)
                }
                onMouseLeave={hideTooltip}
                onClick={() => {
                  onSelectSection(item.id);
                  hideTooltip();
                  onItemClick?.();
                }}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-0' : 'justify-between px-3'
                } min-h-[42px] py-2 rounded-xl text-xs font-medium transition-colors border cursor-pointer relative ${
                  isActive
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                      : 'bg-neutral-900 text-neutral-100 border-neutral-800 font-semibold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-500' : 'text-neutral-400'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </div>

                {!collapsed &&
                  item.badge !== undefined &&
                  item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums shrink-0 ${
                        item.badgeTone === 'amber'
                          ? 'bg-amber-500 text-neutral-950'
                          : isLight
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                {collapsed &&
                  item.badge !== undefined &&
                  item.badge > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-500" />
                  )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Anchored Section: Settings, Sign Out, Sidebar Display Mode Selector */}
      <div
        className={`pt-3 mt-3 border-t space-y-1.5 shrink-0 relative ${
          isLight ? 'border-slate-200' : 'border-neutral-800/80'
        }`}
      >
        {!collapsed && (
          <div className="px-2.5 pb-1 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>Ably Stream</span>
            <span
              className={
                realtimeStatus === 'connected'
                  ? 'text-emerald-500'
                  : realtimeStatus === 'connecting'
                  ? 'text-amber-400'
                  : 'text-neutral-500'
              }
            >
              {realtimeStatus === 'connected'
                ? 'Live'
                : realtimeStatus === 'connecting'
                ? 'Syncing'
                : 'Standby'}
            </span>
          </div>
        )}

        <button
          type="button"
          title={collapsed ? 'Settings' : undefined}
          aria-label="Settings"
          onMouseEnter={(e) =>
            collapsed && showTooltip('Settings', e.currentTarget)
          }
          onMouseLeave={hideTooltip}
          onClick={() => {
            onSelectSection('settings');
            hideTooltip();
            onItemClick?.();
          }}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-0' : 'justify-start px-3'
          } gap-2.5 min-h-[42px] py-2 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${
            activeSection === 'settings'
              ? isLight
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                : 'bg-neutral-900 text-neutral-100 border-neutral-800 font-semibold'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
              : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60 border-transparent'
          }`}
        >
          <Settings
            className={`w-4 h-4 shrink-0 ${
              activeSection === 'settings'
                ? 'text-emerald-500'
                : 'text-neutral-400'
            }`}
          />
          {!collapsed && <span className="whitespace-nowrap">Settings</span>}
        </button>

        <button
          type="button"
          title={collapsed ? 'Sign Out' : undefined}
          aria-label="Sign Out"
          disabled={isSigningOut}
          onMouseEnter={(e) =>
            collapsed && showTooltip('Sign Out', e.currentTarget)
          }
          onMouseLeave={hideTooltip}
          onClick={handleSignOutClick}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-0' : 'justify-start px-3'
          } gap-2.5 min-h-[42px] py-2 rounded-xl text-xs font-medium transition-colors border cursor-pointer disabled:opacity-50 ${
            isLight
              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
              : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/25'
          }`}
        >
          {isSigningOut ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <LogOut className="w-4 h-4 shrink-0" />
          )}
          {!collapsed && (
            <span className="whitespace-nowrap">
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </span>
          )}
        </button>

        {!isMobile && (
          <SidebarDisplayControl
            mode={sidebarMode}
            onChangeMode={(next) => {
              onChangeSidebarMode(next);
              hideTooltip();
            }}
            collapsed={collapsed}
            isLight={isLight}
            isOpen={sidebarPopoverOpen}
            onSetOpen={setSidebarPopoverOpen}
            onShowTooltip={showTooltip}
            onHideTooltip={hideTooltip}
          />
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`h-dvh w-full flex flex-col md:flex-row overflow-hidden ${
        isLight
          ? 'bg-slate-50 text-slate-900'
          : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* Desktop Collapsible / Hover-Expandable Sidebar */}
      <aside
        onMouseEnter={() => {
          if (sidebarMode === 'hover') setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (sidebarMode === 'hover') setIsHovered(false);
          hideTooltip();
        }}
        className={`hidden md:flex flex-col shrink-0 border-r h-full min-h-0 py-3.5 transition-[width,padding] duration-200 ease-out relative z-20 ${
          isDesktopCollapsed ? 'w-[72px] px-2.5' : 'w-64 px-3.5'
        } ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-neutral-950 border-neutral-800/80'
        }`}
      >
        {renderSidebarContent(isDesktopCollapsed, false)}
      </aside>

      <CollapsedSidebarTooltip tooltip={tooltip} isLight={isLight} />

      {/* Mobile Header Bar (<768px) */}
      <header
        className={`md:hidden shrink-0 px-3 py-2 border-b flex items-center justify-between gap-2 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-neutral-950 border-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open Admin Navigation Menu"
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-neutral-900 border-neutral-800 text-neutral-200'
            }`}
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">
              {sectionTitleMap[activeSection]}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 truncate">
              {admin.name} · {admin.accessLevel}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectSection('monitoring')}
          className={`px-2.5 h-9 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSection === 'monitoring'
              ? 'bg-emerald-500 text-neutral-950 border-emerald-500 font-semibold'
              : isLight
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          {waitingQueueCount > 0 && (
            <span className="font-mono font-bold tabular-nums">
              {waitingQueueCount}
            </span>
          )}
        </button>
      </header>

      {/* Mobile Slide-Out Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
            aria-hidden="true"
          />
          <aside
            className={`relative z-10 w-72 max-w-[85vw] h-full p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-r flex flex-col shadow-2xl ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-neutral-950 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-end mb-2">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className={`w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer ${
                  isLight
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    : 'border-neutral-800 text-neutral-400 hover:text-neutral-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {renderSidebarContent(false, true, () =>
                setMobileDrawerOpen(false)
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden">
        {previewInfo?.active && (
          <div
            role="status"
            className={`shrink-0 px-3 sm:px-4 py-2 border-b text-[11px] flex flex-wrap items-center justify-between gap-2 ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="min-w-0 flex-1">
              <span className="font-mono font-bold uppercase tracking-wider text-amber-500 mr-2">
                Preview Mode
              </span>
              <span>
                {!previewInfo.isAuthenticated
                  ? 'Development preview data (`mockData.ts`). Sign in and administrative mutations require the live Express backend.'
                  : `Dev fallback active for ${previewInfo.sources.join(', ')} while backend endpoint is unavailable.`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={previewInfo.onRetryLive}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-[11px] cursor-pointer"
              >
                Retry Live API
              </button>
              {!previewInfo.isAuthenticated && previewInfo.onReturnToSignIn && (
                <button
                  type="button"
                  onClick={previewInfo.onReturnToSignIn}
                  className={`px-2.5 py-1 rounded-lg border font-medium text-[11px] cursor-pointer ${
                    isLight
                      ? 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                      : 'bg-neutral-900 border-amber-500/40 text-amber-200 hover:bg-neutral-800'
                  }`}
                >
                  Live Sign In
                </button>
              )}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};
