import React, { useState, useEffect } from 'react';
import {
  User,
  Sun,
  Moon,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import {
  AdminNotificationPreferences,
  AdminProfile,
  AdminSidebarMode,
} from '../types/admin.types';

interface AdminSettingsPageProps {
  admin: AdminProfile;
  isAuthenticated: boolean;
  theme: 'dark' | 'light';
  onSetTheme: (theme: 'dark' | 'light') => void;
  sidebarMode: AdminSidebarMode;
  onChangeSidebarMode: (mode: AdminSidebarMode) => void;
  notificationPrefs: AdminNotificationPreferences;
  onSaveNotificationPrefs: (
    next: AdminNotificationPreferences
  ) => Promise<{ ok: boolean; error?: string }>;
  onRenewSession: () => Promise<{ ok: boolean; error?: string }>;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  admin,
  isAuthenticated,
  theme,
  onSetTheme,
  sidebarMode,
  onChangeSidebarMode,
  notificationPrefs,
  onSaveNotificationPrefs,
  onRenewSession,
}) => {
  const isLight = theme === 'light';
  const [draftPrefs, setDraftPrefs] =
    useState<AdminNotificationPreferences>(notificationPrefs);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isRenewing, setIsRenewing] = useState(false);
  const [renewFeedback, setRenewFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);

  useEffect(() => {
    setDraftPrefs(notificationPrefs);
  }, [notificationPrefs]);

  const togglePref = (key: keyof AdminNotificationPreferences) => {
    setDraftPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleSavePrefs = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await onSaveNotificationPrefs(draftPrefs);
      if (res.ok) {
        setSaveMessage('Administrator notification preferences saved.');
      } else {
        setSaveError(
          res.error ||
            'Unable to persist preferences (`PATCH /api/admin/settings/notifications`).'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    setRenewFeedback(null);
    try {
      const res = await onRenewSession();
      if (res.ok) {
        setRenewFeedback({
          type: 'ok',
          msg: 'HTTP-only administrator session cookie renewed successfully.',
        });
      } else {
        setRenewFeedback({
          type: 'err',
          msg:
            res.error ||
            'Unable to renew session via backend endpoint (`POST /api/admin/auth/renew`).',
        });
      }
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            Executive Preferences & Security
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Admin Settings
          </h1>
        </div>

        {/* 1. Administrator Profile & Permissions Matrix */}
        <section
          className={`rounded-2xl border p-5 space-y-4 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User className="w-4 h-4 text-emerald-500" />
            <span>Administrator Profile & Permissions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[11px] text-neutral-500 uppercase">Name</div>
              <div className="font-semibold mt-0.5">{admin.name}</div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500 uppercase">
                Email
              </div>
              <div className="font-mono mt-0.5">{admin.email || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500 uppercase">
                Role & Access Level
              </div>
              <div className="mt-0.5">
                {admin.role} · {admin.accessLevel}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500 uppercase">
                Department / Office
              </div>
              <div className="mt-0.5">
                {admin.department}
                {admin.office ? ` · ${admin.office}` : ''}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {(
              [
                {
                  label: 'canManageStaff',
                  granted: admin.permissions.canManageStaff,
                },
                {
                  label: 'canAssignTickets',
                  granted: admin.permissions.canAssignTickets,
                },
                {
                  label: 'canViewReports',
                  granted: admin.permissions.canViewReports,
                },
              ] as const
            ).map((perm) => (
              <div
                key={perm.label}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-neutral-950/60 border-neutral-800'
                }`}
              >
                <span className="font-mono text-[11px]">{perm.label}</span>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    perm.granted ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {perm.granted ? 'Granted' : 'Denied'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Appearance & Sidebar Behavior */}
        <section
          className={`rounded-2xl border p-5 space-y-5 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-500" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span>Appearance & Workspace Layout</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSetTheme('dark')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : isLight
                  ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/40'
              }`}
            >
              <Moon className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Obsidian Dark</div>
                <div className="text-[11px] text-neutral-400">
                  Executive command contrast
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSetTheme('light')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                theme === 'light'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : isLight
                  ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/40'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold">
                  Executive Slate Light
                </div>
                <div className="text-[11px] text-neutral-400">
                  Daylight governance contrast
                </div>
              </div>
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-800/40">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
              <span>Desktop Sidebar Mode</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  {
                    id: 'expanded',
                    label: 'Expanded',
                    desc: 'Always show icons & labels',
                  },
                  {
                    id: 'collapsed',
                    label: 'Collapsed',
                    desc: 'Always show icons with tooltips',
                  },
                  {
                    id: 'hover',
                    label: 'Expand on Hover',
                    desc: 'Expands automatically on hover',
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeSidebarMode(m.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                    sidebarMode === m.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : isLight
                      ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Notification Preferences */}
        <section
          className={`rounded-2xl border p-5 space-y-4 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="w-4 h-4 text-emerald-500" />
              <span>Supervisory Notification Preferences</span>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">
              PATCH /api/admin/settings/notifications
            </span>
          </div>

          <div className="divide-y divide-neutral-800/40">
            {(
              [
                {
                  key: 'escalationAlerts',
                  label: 'Ticket & Conversation Escalation Alerts',
                  desc: 'Alert immediately when an inquiry escalates to Urgent or supervisory review.',
                },
                {
                  key: 'unassignedQueueAlerts',
                  label: 'Unassigned Queue Threshold Warnings',
                  desc: 'Notify when conversations remain in the waiting queue without auto-assignment.',
                },
                {
                  key: 'staffStatusAlerts',
                  label: 'Staff Availability & Capacity Shifts',
                  desc: 'Surface real-time changes across department staffing levels.',
                },
                {
                  key: 'slaBreachWarnings',
                  label: 'SLA Breach Early Warnings',
                  desc: 'Highlight client threads approaching private banking response thresholds.',
                },
                {
                  key: 'desktopNotifications',
                  label: 'Browser Desktop Alerts',
                  desc: 'Allow OS notifications while supervising operations in background tabs.',
                },
              ] as const
            ).map((item) => {
              const enabled = draftPrefs[item.key];
              return (
                <label
                  key={item.key}
                  className="py-3 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{item.label}</div>
                    <div className="text-[11px] text-neutral-400">
                      {item.desc}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => togglePref(item.key)}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
                      enabled
                        ? 'bg-emerald-500'
                        : isLight
                        ? 'bg-slate-300'
                        : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>

          {saveMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                isLight
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {saveError && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                isLight
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSavePrefs}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Preferences</span>
            </button>
          </div>
        </section>

        {/* 4. Security & Cookie Session Status */}
        <section
          className={`rounded-2xl border p-5 space-y-3 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Session Security (`aureus_admin_session`)</span>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold ${
                isAuthenticated ? 'text-emerald-500' : 'text-amber-500'
              }`}
            >
              {isAuthenticated ? 'Cookie Verified' : 'Preview Mode Only'}
            </span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Sessions are authenticated via Supabase Auth, validated against
            Prisma `AdminProfile`, and persisted exclusively in PostgreSQL
            `AdminSession` with HTTP-only cookies. No Bearer tokens or session
            identifiers are stored in browser storage.
          </p>

          {renewFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                renewFeedback.type === 'ok'
                  ? isLight
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : isLight
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              {renewFeedback.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{renewFeedback.msg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isRenewing || !isAuthenticated}
              onClick={handleRenew}
              className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRenewing ? 'animate-spin' : ''}`}
              />
              <span>Renew Admin Session</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
