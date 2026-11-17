import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowUpDown,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import {
  AdminAccountStatus,
  AdminAvailabilityEnum,
  AdminProfile,
  AdminStaffRecord,
  CreateStaffInput,
  UpdateStaffInput,
} from '../types/admin.types';
import { ADMIN_DEPARTMENTS } from '../config/adminConfig';
import { adminPortalService } from '../services/adminPortalService';

interface AdminStaffManagementPageProps {
  admin: AdminProfile;
  staffDirectory: AdminStaffRecord[];
  onStaffCreated: (created: AdminStaffRecord) => void;
  onStaffUpdated: (updated: AdminStaffRecord) => void;
  isLoadingData: boolean;
  dataError: string | null;
  onRetryLoad: () => void;
  theme: 'dark' | 'light';
}

type SortKey = 'fullName' | 'department' | 'availability' | 'activeConversationsCount';

export const AdminStaffManagementPage: React.FC<
  AdminStaffManagementPageProps
> = ({
  admin,
  staffDirectory,
  onStaffCreated,
  onStaffUpdated,
  isLoadingData,
  dataError,
  onRetryLoad,
  theme,
}) => {
  const isLight = theme === 'light';
  const canManage = admin.permissions.canManageStaff;

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [availFilter, setAvailFilter] = useState<'All' | AdminAvailabilityEnum>(
    'All'
  );
  const [statusFilter, setStatusFilter] = useState<'All' | AdminAccountStatus>(
    'All'
  );
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortAsc, setSortAsc] = useState(true);

  // Integrated Create / Edit Drawer State
  const [activeModal, setActiveModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; staff: AdminStaffRecord }
    | null
  >(null);

  // Create Form State (No password field — backend triggers Supabase invite)
  const [createForm, setCreateForm] = useState<CreateStaffInput>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    department: ADMIN_DEPARTMENTS[0],
    maxChats: 5,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateStaffInput>({});
  const [pendingSensitiveStatus, setPendingSensitiveStatus] =
    useState<AdminAccountStatus | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = staffDirectory
    .filter((s) => {
      const matchesDept = deptFilter === 'All' || s.department === deptFilter;
      const matchesAvail =
        availFilter === 'All' || s.availability === availFilter;
      const matchesStatus =
        statusFilter === 'All' || s.accountStatus === statusFilter;
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q);
      return matchesDept && matchesAvail && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === 'activeConversationsCount') {
        return (a.activeConversationsCount - b.activeConversationsCount) * dir;
      }
      return String(a[sortKey]).localeCompare(String(b[sortKey])) * dir;
    });

  const openCreateModal = () => {
    if (!canManage) return;
    setCreateForm({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      department: ADMIN_DEPARTMENTS[0],
      maxChats: 5,
    });
    setFormError(null);
    setActiveModal({ mode: 'create' });
  };

  const openEditModal = (staff: AdminStaffRecord) => {
    if (!canManage) return;
    setEditForm({
      firstName: staff.firstName,
      lastName: staff.lastName,
      username: staff.username,
      department: staff.department,
      role: staff.role,
      maxChats: staff.maxChats,
      accountStatus: staff.accountStatus,
    });
    setPendingSensitiveStatus(null);
    setFormError(null);
    setActiveModal({ mode: 'edit', staff });
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || isSubmitting) return;
    setFormError(null);
    setBannerSuccess(null);

    if (
      !createForm.firstName.trim() ||
      !createForm.lastName.trim() ||
      !createForm.username.trim() ||
      !createForm.email.includes('@')
    ) {
      setFormError(
        'Enter first name, last name, username, and a valid corporate email.'
      );
      return;
    }

    if (createForm.maxChats < 1 || createForm.maxChats > 25) {
      setFormError('Maximum concurrent chats must be between 1 and 25.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminPortalService.createStaff(createForm);
      if (res.success && res.data) {
        onStaffCreated(res.data);
        setBannerSuccess(
          `Staff account provisioned (${res.data.fullName}). Supabase onboarding invitation dispatched.`
        );
        setActiveModal(null);
      } else {
        setFormError(
          res.error?.message ||
            'Unable to create staff member (`POST /api/admin/staff`). No local simulation was applied.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeEditSubmit = async (overrides?: UpdateStaffInput) => {
    if (!canManage || activeModal?.mode !== 'edit' || isSubmitting) return;
    setFormError(null);
    setBannerSuccess(null);

    const payload = { ...editForm, ...overrides };
    if (
      payload.maxChats !== undefined &&
      (payload.maxChats < 1 || payload.maxChats > 25)
    ) {
      setFormError('Maximum concurrent chats must be between 1 and 25.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminPortalService.updateStaff(
        activeModal.staff.id,
        payload
      );
      if (res.success && res.data) {
        onStaffUpdated(res.data);
        setBannerSuccess(
          `Staff profile updated and confirmed by backend (${res.data.fullName}).`
        );
        setPendingSensitiveStatus(null);
        setActiveModal(null);
      } else {
        setFormError(
          res.error?.message ||
            'Backend rejected or could not process update (`PATCH /api/admin/staff/:id`).'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal?.mode !== 'edit') return;

    const statusChanged =
      editForm.accountStatus &&
      editForm.accountStatus !== activeModal.staff.accountStatus;

    if (statusChanged && !pendingSensitiveStatus) {
      setPendingSensitiveStatus(editForm.accountStatus!);
      return;
    }

    await executeEditSubmit();
  };

  const renderAvailabilityText = (av: AdminAvailabilityEnum) => {
    const color =
      av === 'ONLINE'
        ? 'text-emerald-500'
        : av === 'BUSY'
        ? 'text-amber-500'
        : av === 'AWAY'
        ? 'text-sky-400'
        : 'text-neutral-500';
    return <span className={`font-mono font-semibold ${color}`}>{av}</span>;
  };

  const renderAccountStatusText = (st: AdminAccountStatus) => {
    const color =
      st === 'ACTIVE'
        ? 'text-emerald-500'
        : st === 'INVITED'
        ? 'text-sky-400'
        : st === 'SUSPENDED'
        ? 'text-amber-500'
        : 'text-rose-500';
    return <span className={`font-mono font-semibold ${color}`}>{st}</span>;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header & Controls */}
      <div
        className={`p-4 sm:px-6 border-b space-y-3 shrink-0 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-neutral-950/60 border-neutral-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Staff Management
            </h1>
            <p className="text-xs text-neutral-400">
              Integrated Staff Directory, Supabase Invitation Provisioning, and
              Capacity Governance
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRetryLoad}
              disabled={isLoadingData}
              className={`px-3 h-9 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoadingData ? 'animate-spin text-emerald-500' : ''
                }`}
              />
              <span className="hidden sm:inline">Sync Directory</span>
            </button>

            <button
              type="button"
              disabled={!canManage}
              onClick={openCreateModal}
              className="px-3.5 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Staff</span>
            </button>
          </div>
        </div>

        {/* Permission Notice */}
        {!canManage && (
          <div
            role="alert"
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              isLight
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              Restricted Access (`canManageStaff` disabled): Directory is
              read-only. Provisioning and profile/status updates are enforced by
              backend `requireAdminPermission`.
            </span>
          </div>
        )}

        {/* Search & Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, @username, email..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-100'
              }`}
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className={`px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <option value="All">All Departments</option>
            {ADMIN_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={availFilter}
            onChange={(e) =>
              setAvailFilter(e.target.value as 'All' | AdminAvailabilityEnum)
            }
            aria-label="Filter by availability"
            className={`px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <option value="All">All Availability States</option>
            <option value="ONLINE">ONLINE</option>
            <option value="BUSY">BUSY</option>
            <option value="AWAY">AWAY</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'All' | AdminAccountStatus)
            }
            aria-label="Filter by account status"
            className={`px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <option value="All">All Account Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INVITED">INVITED</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="DEACTIVATED">DEACTIVATED</option>
          </select>
        </div>
      </div>

      {/* Scrollable Directory Workspace */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
        {bannerSuccess && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              isLight
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{bannerSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerSuccess(null)}
              className="p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {dataError && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              isLight
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{dataError}</span>
          </div>
        )}

        {isLoadingData ? (
          <div className="min-h-[240px] flex flex-col items-center justify-center text-xs text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span>Loading staff directory (`GET /api/admin/staff`)...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="min-h-[240px] flex flex-col items-center justify-center text-center space-y-2 p-6">
            <Users className="w-8 h-8 text-neutral-500" />
            <div className="text-sm font-medium">No matching staff records</div>
            <p className="text-xs text-neutral-500 max-w-sm">
              Adjust directory filters or provision a new support specialist.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Directory Table (md+) */}
            <div
              className={`hidden md:block rounded-2xl border overflow-hidden ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-neutral-900/60 border-neutral-800'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : 'bg-neutral-950/70 border-neutral-800 text-neutral-500'
                      }`}
                    >
                      <th className="py-3 px-4 font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort('fullName')}
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Specialist</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold">Username</th>
                      <th className="py-3 px-4 font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort('department')}
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Department</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort('availability')}
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Availability</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('activeConversationsCount')}
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Active / Max</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold">Account Status</th>
                      <th className="py-3 px-4 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      isLight ? 'divide-slate-200' : 'divide-neutral-800/70'
                    }`}
                  >
                    {filtered.map((member) => (
                      <tr
                        key={member.id}
                        className={
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/40'
                        }
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold">{member.fullName}</div>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {member.email}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-400">
                          @{member.username}
                        </td>
                        <td className="py-3 px-4">{member.department}</td>
                        <td className="py-3 px-4">
                          {renderAvailabilityText(member.availability)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {member.activeConversationsCount} / {member.maxChats}
                        </td>
                        <td className="py-3 px-4">
                          {renderAccountStatusText(member.accountStatus)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => openEditModal(member)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer disabled:opacity-40 ${
                              isLight
                                ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                                : 'border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards (<md) */}
            <div className="md:hidden space-y-2.5">
              {filtered.map((member) => (
                <div
                  key={member.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isLight
                      ? 'bg-white border-slate-200'
                      : 'bg-neutral-900/60 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {member.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500 truncate">
                        @{member.username} · {member.email}
                      </div>
                    </div>
                    <div className="text-[11px] shrink-0">
                      {renderAvailabilityText(member.availability)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                    <span>{member.department}</span>
                    <span className="font-mono tabular-nums">
                      {member.activeConversationsCount}/{member.maxChats} chats
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/40 text-xs">
                    <div>{renderAccountStatusText(member.accountStatus)}</div>
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => openEditModal(member)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                        isLight
                          ? 'border-slate-200 text-slate-700'
                          : 'border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Staff</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Staff Modal (Full-screen on Mobile, Centered Card on Desktop) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div
            onClick={() => !isSubmitting && setActiveModal(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              activeModal.mode === 'create'
                ? 'Create Support Staff'
                : 'Edit Staff Member'
            }
            className={`relative z-10 w-full h-full sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-2xl border flex flex-col shadow-2xl overflow-hidden ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-neutral-950/70 border-neutral-800'
              }`}
            >
              <div>
                <h2 className="text-sm font-bold">
                  {activeModal.mode === 'create'
                    ? 'Provision New Support Specialist'
                    : `Edit Staff · ${activeModal.staff.fullName}`}
                </h2>
                <p className="text-[11px] text-neutral-400">
                  {activeModal.mode === 'create'
                    ? 'Dispatches Supabase onboarding invitation (`POST /api/admin/staff`)'
                    : 'Profile, capacity & account status (`PATCH /api/admin/staff/:id`)'}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeModal.mode === 'create' ? (
              <form
                onSubmit={handleSubmitCreate}
                className="flex-1 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4"
              >
                {formError && (
                  <div
                    role="alert"
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      isLight
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.firstName}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          firstName: e.target.value,
                        }))
                      }
                      placeholder="Sarah"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.lastName}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                      placeholder="Okafor"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">Username</label>
                    <input
                      type="text"
                      required
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          username: e.target.value,
                        }))
                      }
                      placeholder="sokafor"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">
                      Max Concurrent Chats
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      required
                      value={createForm.maxChats}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          maxChats: Number(e.target.value) || 5,
                        }))
                      }
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono tabular-nums ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium block">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="sarah.okafor@aureusbank.com"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                      isLight
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-neutral-950 border-neutral-800'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium block">Department</label>
                  <select
                    value={createForm.department}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        department: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                      isLight
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-neutral-950 border-neutral-800'
                    }`}
                  >
                    {ADMIN_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={`p-3 rounded-xl border text-[11px] text-neutral-400 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-neutral-950/60 border-neutral-800'
                  }`}
                >
                  Staff receive an email invitation via Supabase Auth and
                  configure their own password. No passwords or manual setup
                  tokens are generated in the Admin Portal.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-700 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Send Staff Invitation</span>
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleSubmitEdit}
                className="flex-1 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4"
              >
                {formError && (
                  <div
                    role="alert"
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      isLight
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, firstName: e.target.value }))
                      }
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">Department</label>
                    <select
                      value={editForm.department || ADMIN_DEPARTMENTS[0]}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          department: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      {ADMIN_DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">
                      Max Concurrent Chats
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={editForm.maxChats ?? 5}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          maxChats: Number(e.target.value) || 5,
                        }))
                      }
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono tabular-nums ${
                        isLight
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium block">Role Title</label>
                  <input
                    type="text"
                    value={editForm.role || ''}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, role: e.target.value }))
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                      isLight
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-neutral-950 border-neutral-800'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium block">
                    Account Activation Status (Backend Enforced)
                  </label>
                  <select
                    value={editForm.accountStatus || 'ACTIVE'}
                    onChange={(e) => {
                      setEditForm((p) => ({
                        ...p,
                        accountStatus: e.target.value as AdminAccountStatus,
                      }));
                      setPendingSensitiveStatus(null);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono ${
                      isLight
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-neutral-950 border-neutral-800'
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="DEACTIVATED">DEACTIVATED</option>
                  </select>
                </div>

                {pendingSensitiveStatus && (
                  <div
                    role="alert"
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isLight
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        Confirm Account Status Change → {pendingSensitiveStatus}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      Changing staff account status revokes active desk routing.
                      Click &ldquo;Confirm Update&rdquo; to submit to backend.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-700 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>
                      {pendingSensitiveStatus
                        ? 'Confirm Update'
                        : 'Save Staff Changes'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
