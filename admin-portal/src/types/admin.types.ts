import type {
  CustomerProfile,
  InquiryCategory,
  SupportAgent,
  SupportTicket,
  TicketPriority,
  TicketStatus,
} from '@/src/types/support';

export type {
  CustomerProfile,
  InquiryCategory,
  SupportAgent,
  TicketPriority,
  TicketStatus,
};

export type SupportCategory = InquiryCategory | string;
export type TicketCategory = SupportTicket['category'] | string;

export interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

export type AdminAvailabilityEnum = 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';

export type AdminAccountStatus =
  | 'ACTIVE'
  | 'INVITED'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type AdminSidebarMode = 'expanded' | 'collapsed' | 'hover';

export type AdminNavSection =
  | 'overview'
  | 'staff'
  | 'monitoring'
  | 'tickets'
  | 'settings';

export interface AdminPermissions {
  canManageStaff: boolean;
  canAssignTickets: boolean;
  canViewReports: boolean;
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
  accessLevel: string;
  department: string;
  office?: string;
  permissions: AdminPermissions;
}

export interface AdminSessionState {
  admin: AdminProfile;
  expiresAt?: string;
}

export interface AdminApiError {
  code: string;
  message: string;
  status?: number;
  field?: string;
  unimplemented?: boolean;
  forbidden?: boolean;
}

export interface AdminApiResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: AdminApiError;
  isMockFallback?: boolean;
  fallbackReason?: string;
}

export interface AdminStaffRecord {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  email: string;
  department: string;
  role: string;
  availability: AdminAvailabilityEnum;
  activeConversationsCount: number;
  maxChats: number;
  accountStatus: AdminAccountStatus;
  lastSeenAt?: string;
  createdAt?: string;
}

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  department: string;
  maxChats: number;
}

export interface UpdateStaffInput {
  firstName?: string;
  lastName?: string;
  username?: string;
  department?: string;
  role?: string;
  maxChats?: number;
  accountStatus?: AdminAccountStatus;
}

export interface AdminChatMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'agent' | 'system';
  agentId?: string;
  agentName?: string;
  text: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  attachment?: {
    name: string;
    size: string;
    type: 'pdf' | 'image' | 'receipt';
    url?: string;
  };
  voiceNote?: {
    url?: string;
    durationSeconds: number;
    transcript?: string;
  };
  isPrivateNote?: boolean;
  isWhisper?: boolean;
  editedAt?: string;
  deletedAt?: string;
  reactions?: MessageReaction[];
  readByCustomerAt?: string;
  readByStaffAt?: string;
}

export interface AdminConversation {
  id: string;
  agent: SupportAgent;
  assignedStaffId: string;
  assignedStaffName: string;
  customerId: string;
  customerName: string;
  customerTier: string;
  customerAvatar?: string;
  customerOnline?: boolean;
  customerLastSeenAt?: string;
  subject: string;
  department: string;
  category: SupportCategory;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  status: 'active' | 'pending' | 'resolved';
  linkedTicketId?: string;
  internalNotes?: string | string[];
  messages: AdminChatMessage[];
  createdAt?: string;
  isUnassigned?: boolean;
  waitingSince?: string;
  isEscalated?: boolean;
}

export interface AdminTicketWhisperNote {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  isWhisper: boolean;
  createdAt: string;
}

export interface AdminTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignedAgent: string;
  assignedAgentId?: string;
  customerId?: string;
  customerName?: string;
  description: string;
  conversationId?: string;
  investigationNotes?: string;
  resolution?: string;
  whisperNotes?: AdminTicketWhisperNote[];
  slaDueAt?: string;
  autoAssigned?: boolean;
}

export interface AdminActivityItem {
  id: string;
  type: 'escalation' | 'assignment' | 'queue' | 'staff' | 'ticket';
  title: string;
  detail: string;
  timestamp: string;
  relatedConversationId?: string;
  relatedTicketId?: string;
}

export interface AdminDepartmentMetric {
  department: string;
  activeConversations: number;
  openTickets: number;
  onlineStaff: number;
}

export interface AdminOverviewData {
  activeConversations: number;
  openAndPendingTickets: number;
  onlineAndAvailableStaff: number;
  totalStaff: number;
  waitingQueueCount: number;
  unassignedConversationsCount: number;
  escalationsCount: number;
  recentActivity: AdminActivityItem[];
  departmentMetrics: AdminDepartmentMetric[];
}

export type AdminAiAssistMode =
  | 'summary'
  | 'escalation_analysis'
  | 'staff_workload'
  | 'activity_summary'
  | 'troubleshooting';

export interface AdminAiAssistEntry {
  id: string;
  mode: AdminAiAssistMode;
  prompt: string;
  content: string;
  createdAt: string;
  model?: string;
  conversationId?: string;
}

export interface AdminNotificationPreferences {
  escalationAlerts: boolean;
  unassignedQueueAlerts: boolean;
  staffStatusAlerts: boolean;
  slaBreachWarnings: boolean;
  desktopNotifications: boolean;
}
