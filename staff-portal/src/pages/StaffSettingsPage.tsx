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
  PanelLeft,
} from 'lucide-react';
import {
  StaffMemberProfile,
  StaffNotificationPreferences,
  StaffSidebarMode,
} from '../types/staff.types';

interface StaffSettingsPageProps {
  staff: StaffMemberProfile;
  theme: 'dark' | 'light';
  onSetTheme: (theme: 'dark' | 'light') => void;
  sidebarMode: StaffSidebarMode;
  onChangeSidebarMode: (mode: StaffSidebarMode) => void;
  notificationPrefs: StaffNotificationPreferences;
  onSaveNotificationPrefs: (
    next: StaffNotificationPreferences
  ) => Promise<{ ok: boolean; error?: string }>;
}

export const StaffSettingsPage: React.FC<StaffSettingsPageProps> = ({
  staff,
  theme,
  onSetTheme,
  sidebarMode,
  onChangeSidebarMode,
  notificationPrefs,
  onSaveNotificationPrefs,
}) => {
  const isLight = theme === 'light';
  const [draftPrefs, setDraftPrefs] =
    useState<StaffNotificationPreferences>(notificationPrefs);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraftPrefs(notificationPrefs);
  }, [notificationPrefs]);

  const togglePref = (key: keyof StaffNotificationPreferences) => {
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
        setSaveMessage('Notification preferences saved to staff profile.');
      } else {
        setSaveError(
          res.error ||
            'Unable to persist preferences (`PATCH /api/staff/settings/notifications`).'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="space-y-1">
        <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
          Desk Preferences
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      {/* Section 1: Staff Profile (Read-Only Verified Identity) */}
      <section
        className={`rounded-2xl border p-5 space-y-4 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-neutral-900 border-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="w-4 h-4 text-emerald-500" />
          <span>Specialist Profile</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[11px] text-neutral-500 uppercase">Full Name</div>
            <div className="font-semibold mt-0.5">{staff.name}</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-500 uppercase">Email</div>
            <div className="font-mono mt-0.5">{staff.email || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-500 uppercase">
              Role & Department
            </div>
            <div className="mt-0.5">
              {staff.role} · {staff.department}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-500 uppercase">
              Chat Concurrency Limit
            </div>
            <div className="font-mono mt-0.5 tabular-nums">
              {staff.maxChats} concurrent client threads
            </div>
          </div>
          {staff.specialization && (
            <div className="sm:col-span-2">
              <div className="text-[11px] text-neutral-500 uppercase">
                Specialization
              </div>
              <div
                className={`mt-0.5 ${
                  isLight ? 'text-slate-700' : 'text-neutral-300'
                }`}
              >
                {staff.specialization}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Appearance */}
      <section
        className={`rounded-2xl border p-5 space-y-4 ${
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
          <span>Appearance</span>
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
                High-contrast private desk palette
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
              <div className="text-xs font-semibold">Executive Slate Light</div>
              <div className="text-[11px] text-neutral-400">
                Crisp daylight surface contrast
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2 border-t border-neutral-800/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <PanelLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sidebar Display Mode</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  id: 'expanded',
                  label: 'Expanded',
                  desc: 'Always show labels',
                },
                {
                  id: 'collapsed',
                  label: 'Collapsed',
                  desc: 'Icons with tooltips',
                },
                {
                  id: 'hover',
                  label: 'Expand on Hover',
                  desc: 'Auto-expand on hover',
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeSidebarMode(opt.id)}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  sidebarMode === opt.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isLight
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/40'
                }`}
              >
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Notification Preferences */}
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
            <span>Notification Preferences</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            PATCH /api/staff/settings/notifications
          </span>
        </div>

        <div className="divide-y divide-neutral-800/40">
          {(
            [
              {
                key: 'newAssignmentAlert',
                label: 'New Client Conversation Assignments',
                desc: 'Alert immediately when a client thread is routed to your desk.',
              },
              {
                key: 'unreadMessageChime',
                label: 'Incoming Client Message Indicator',
                desc: 'Play subtle audio cue when an active client sends a reply.',
              },
              {
                key: 'ticketEscalationAlert',
                label: 'Ticket Escalation & Priority Changes',
                desc: 'Notify when an assigned ticket moves to Urgent or Escalated.',
              },
              {
                key: 'whisperMentionAlert',
                label: 'Internal Whisper Note Updates',
                desc: 'Highlight authorized internal staff notes on tickets and chats.',
              },
              {
                key: 'desktopNotifications',
                label: 'Browser Notifications',
                desc: 'Allow OS notifications when the staff portal tab is in the background.',
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
                  <div className="text-[11px] text-neutral-400">{item.desc}</div>
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
      </div>
    </div>
  );
};
