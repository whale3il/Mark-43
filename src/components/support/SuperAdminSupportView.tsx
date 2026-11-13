import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Plus,
  Trash2,
  Edit2,
  BarChart3,
  Search,
  Headphones,
  Check,
  X,
  TrendingUp,
  FileText
} from 'lucide-react';
import {
  SupportAgent,
  SupportConversation,
  SupportTicket,
  CannedResponse,
  SupportAnalytics,
  StaffAvailability
} from '../../types/support';

interface SuperAdminSupportViewProps {
  staffList: SupportAgent[];
  conversations: SupportConversation[];
  tickets: SupportTicket[];
  cannedResponses: CannedResponse[];
  analytics: SupportAnalytics;
  onUpdateStaffAvailability: (staffId: string, status: StaffAvailability) => void;
  onReassignConversation: (conversationId: string, newStaffId: string) => void;
  onAddCannedResponse: (newTemplate: Omit<CannedResponse, 'id'>) => void;
  onDeleteCannedResponse: (templateId: string) => void;
  theme?: 'dark' | 'light';
}

export const SuperAdminSupportView: React.FC<SuperAdminSupportViewProps> = ({
  staffList,
  conversations,
  tickets,
  cannedResponses,
  analytics,
  onUpdateStaffAvailability,
  onReassignConversation,
  onAddCannedResponse,
  onDeleteCannedResponse,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  // Sub-tabs: 'overview' | 'staff' | 'conversations' | 'canned'
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'conversations' | 'canned'>('overview');

  // Search filter for conversation monitoring
  const [convSearch, setConvSearch] = useState('');

  // Reassignment modal
  const [reassignTargetConv, setReassignTargetConv] = useState<SupportConversation | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');

  // New Canned Response form state
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [newShortcut, setNewShortcut] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CannedResponse['category']>('Wires & Transfers');
  const [newContent, setNewContent] = useState('');

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.trim() || !newTitle.trim() || !newContent.trim()) return;

    onAddCannedResponse({
      shortcut: newShortcut.startsWith('/') ? newShortcut.trim() : `/${newShortcut.trim()}`,
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim()
    });

    setNewShortcut('');
    setNewTitle('');
    setNewContent('');
    setShowAddTemplateModal(false);
  };

  const handleExecuteReassignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTargetConv || !selectedStaffId) return;
    onReassignConversation(reassignTargetConv.id, selectedStaffId);
    setReassignTargetConv(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full space-y-2 sm:space-y-2.5 animate-in fade-in duration-200">
      {/* Compact Sticky Governance Header & Sub-nav */}
      <div
        className={`px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 shrink-0 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold shrink-0">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight truncate">
                Super Admin Support Governance
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Tier 4 Sovereign Oversight
              </span>
            </div>
            <p className={`text-[10px] sm:text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Supervise {staffList.length} private wealth desks, SLA metrics, and counterparty case routing
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className={`flex items-center gap-1 p-0.5 rounded-xl border text-[11px] sm:text-xs overflow-x-auto whitespace-nowrap w-full xl:w-auto ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-neutral-950/60 border-neutral-800'
          }`}
        >
          {(
            [
              { id: 'overview', label: 'Analytics Overview', icon: <BarChart3 className="w-3.5 h-3.5 shrink-0" /> },
              { id: 'staff', label: `${staffList.length} Staff Desks`, icon: <Users className="w-3.5 h-3.5 shrink-0" /> },
              { id: 'conversations', label: 'Live Monitoring', icon: <MessageSquare className="w-3.5 h-3.5 shrink-0" /> },
              { id: 'canned', label: 'Canned Templates', icon: <FileText className="w-3.5 h-3.5 shrink-0" /> }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dedicated Independently Scrollable Admin Workspace Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 sm:space-y-4 pb-4 pr-0.5">
      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between">
              <span className="text-xs font-mono uppercase text-neutral-400">Total Active Consults</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                {conversations.filter((c) => c.status === 'active').length}
              </div>
              <span className="text-[11px] text-neutral-500 mt-1">Across 5 specialized desks</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between">
              <span className="text-xs font-mono uppercase text-neutral-400">Avg First Response</span>
              <div className="text-2xl font-bold font-mono text-neutral-100 mt-2">
                {analytics.avgResponseTime}
              </div>
              <span className="text-[11px] text-emerald-400 mt-1">✓ Well under 2m SLA target</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between">
              <span className="text-xs font-mono uppercase text-neutral-400">CSAT Satisfaction</span>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-2">
                {analytics.csatScore}%
              </div>
              <span className="text-[11px] text-neutral-500 mt-1">Sovereign Client feedback</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between">
              <span className="text-xs font-mono uppercase text-neutral-400">Pending Resolution</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
                {conversations.filter((c) => c.status === 'pending').length}
              </div>
              <span className="text-[11px] text-neutral-500 mt-1">Under compliance review</span>
            </div>
          </div>

          {/* Inquiry Category Breakdown */}
          <div className="p-4 sm:p-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Inquiry Classification Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {analytics.categoryBreakdown.map((item) => (
                <div key={item.category} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/40">
                  <div className="text-xs font-medium text-neutral-300">{item.category}</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{item.percentage}%</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{item.count} conversations</div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 5 STAFF DESKS & AVAILABILITY */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {staffList.map((agent) => (
            <div
              key={agent.id}
              className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-sm">
                      {agent.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-100">{agent.name}</div>
                      <div className="text-[11px] text-emerald-400 font-mono">{agent.department}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    ⭐ {agent.rating || 4.98}
                  </span>
                </div>

                <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
                  {agent.specialization}
                </p>

                <div className="mt-3 pt-3 border-t border-neutral-800/80 text-xs space-y-1 text-neutral-400">
                  <div>Office: <strong className="text-neutral-200">{agent.office}</strong></div>
                  <div>Direct Phone: <strong className="font-mono text-neutral-200">{agent.directPhone}</strong></div>
                  <div>Credentials: <strong className="text-neutral-200">{agent.license}</strong></div>
                </div>
              </div>

              {/* Status and Active Count Controls */}
              <div className="pt-3 border-t border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Active Queue:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {conversations.filter((c) => c.agent.id === agent.id).length} chats
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  {(['online', 'busy', 'away', 'offline'] as const).map((st) => {
                    const isSelected = agent.status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => onUpdateStaffAvailability(agent.id, st)}
                        className={`py-1 rounded capitalize font-medium transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CONVERSATION MONITORING & LIVE REASSIGNMENT */}
      {activeTab === 'conversations' && (
        <div className="p-3.5 sm:p-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Active Client Consultations</h3>
              <p className="text-xs text-neutral-400">Monitor messages in real-time or reassign cases across desks</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by client or topic..."
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-950 text-xs text-neutral-100"
              />
            </div>
          </div>

          {/* Mobile Conversation Monitoring Cards */}
          <div className="md:hidden space-y-2.5">
            {conversations
              .filter(
                (c) =>
                  c.customerName.toLowerCase().includes(convSearch.toLowerCase()) ||
                  c.subject.toLowerCase().includes(convSearch.toLowerCase())
              )
              .map((conv) => (
                <div
                  key={conv.id}
                  className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-100 truncate">{conv.customerName}</div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">{conv.customerTier}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                        conv.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : conv.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {conv.status}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-emerald-400">{conv.subject}</div>
                    <div className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">{conv.lastMessage}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-200 truncate">{conv.agent.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono truncate">
                        {conv.agent.department} · {conv.lastMessageTimestamp}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReassignTargetConv(conv)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                      <span>Reassign</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/60 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="p-3">Client</th>
                  <th className="p-3">Topic / Subject</th>
                  <th className="p-3">Assigned Desk</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Active</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {conversations
                  .filter(
                    (c) =>
                      c.customerName.toLowerCase().includes(convSearch.toLowerCase()) ||
                      c.subject.toLowerCase().includes(convSearch.toLowerCase())
                  )
                  .map((conv) => (
                    <tr key={conv.id} className="hover:bg-neutral-800/20 transition-colors">
                      <td className="p-3 font-semibold text-neutral-100">
                        {conv.customerName}
                        <span className="block text-[10px] font-mono text-neutral-400 font-normal">
                          {conv.customerTier}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-emerald-400 block">{conv.subject}</span>
                        <span className="text-[11px] text-neutral-400 line-clamp-1">{conv.lastMessage}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-neutral-200">{conv.agent.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{conv.agent.department}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            conv.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : conv.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}
                        >
                          {conv.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-neutral-400 text-[11px]">
                        {conv.lastMessageTimestamp}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setReassignTargetConv(conv)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                          <span>Reassign</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CANNED RESPONSES MANAGEMENT */}
      {activeTab === 'canned' && (
        <div className="p-3.5 sm:p-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Approved Canned Response Library</h3>
              <p className="text-xs text-neutral-400">
                Staff triggers these shortcuts in the composer by typing &ldquo;/&rdquo;
              </p>
            </div>
            <button
              onClick={() => setShowAddTemplateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {cannedResponses.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">{item.shortcut}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {item.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-neutral-100 mt-2">{item.title}</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed bg-neutral-900 p-2.5 rounded-lg border border-neutral-800/80">
                    {item.content}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onDeleteCannedResponse(item.id)}
                    className="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Reassign Conversation Modal */}
      {reassignTargetConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-semibold">Reassign Client Conversation</h4>
              <button
                onClick={() => setReassignTargetConv(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteReassignment} className="space-y-4 text-xs">
              <div>
                <span className="text-neutral-400 block mb-1">Target Client Case</span>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <strong className="text-neutral-100">{reassignTargetConv.customerName}</strong>: {reassignTargetConv.subject}
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Reassign to Staff Officer</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-xs text-neutral-100"
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.department} ({st.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignTargetConv(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Canned Response Modal */}
      {showAddTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-semibold">Add Approved Canned Template</h4>
              <button
                onClick={() => setShowAddTemplateModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Command Shortcut</label>
                  <input
                    type="text"
                    required
                    placeholder="/escrow"
                    value={newShortcut}
                    onChange={(e) => setNewShortcut(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100"
                  >
                    <option value="Greetings">Greetings</option>
                    <option value="Wires & Transfers">Wires & Transfers</option>
                    <option value="Security & KYC">Security & KYC</option>
                    <option value="Hold & Verification">Hold & Verification</option>
                    <option value="Closing">Closing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Template Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dual-Signatory Escalation Warning"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Response Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Full text that will be inserted when staff triggers this shortcut..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTemplateModal(false)}
                  className="px-3 py-1.5 rounded-xl text-neutral-400 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
