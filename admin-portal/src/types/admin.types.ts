import type {
  CustomerProfile,
  InquiryCategory,
  SupportAgent,
  SupportTicket,
  TicketPriority,
  TicketStatus,
} from '@/src/types/support';

/**
 * WhalesVault Admin Portal
 *
 * Backend: Express + Supabase Auth + Prisma
 * Authentication: HTTP-only session cookies
 * Real-time communication: Ably
 *
 * Backend responses are normalized into frontend types
 * to preserve compatibility with existing components.
 */

export type {
  CustomerProfile,
  InquiryCategory,
  SupportAgent,
  TicketPriority,
  TicketStatus,
};

/* ==========================================
   SHARED TYPES
========================================== */

export type SupportCategory = InquiryCategory | string;

export type TicketCategory = SupportTicket['category'] | string;

export interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

/* ==========================================
   ENUMS
========================================== */

export type AdminAvailabilityEnum =
  | 'ONLINE'
  | 'BUSY'
  | 'AWAY'
  | 'OFFLINE';

export type AdminAccountStatus =
  | 'ACTIVE'
  | 'INVITED'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type AdminSidebarMode =
  | 'expanded'
  | 'collapsed'
  | 'hover';

export type AdminNavSection =
  | 'overview'
  | 'staff'
  | 'monitoring'
  | 'tickets'
  | 'settings';

/* ==========================================
   ADMIN PERMISSIONS
========================================== */

export interface AdminPermissions {
  canManageStaff: boolean;
  canAssignTickets: boolean;
  canViewReports: boolean;
}

/* ==========================================
   ADMIN PROFILE
========================================== */

export interface AdminProfile {
  id: string;
  email: string;

  // Existing frontend fields
  name: string;
  initials: string;

  role: string;
  accessLevel: string;
  department: string;
  office?: string;

  permissions: AdminPermissions;

  // WhalesVault backend identity fields
  username?: string;
  firstName?: string;
  lastName?: string;
}

/* ==========================================
   ADMIN SESSION
========================================== */

export interface AdminSessionState {
  admin: AdminProfile;

  // Supports Unix timestamps and ISO strings
  expiresAt?: number | string;
}

/* ==========================================
   API ERRORS
========================================== */

export interface AdminApiError {
  code: string;
  message: string;
  status?: number;
  field?: string;
  unimplemented?: boolean;
  forbidden?: boolean;
}

/* ==========================================
   API RESPONSE
========================================== */

export interface AdminApiResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: AdminApiError;
  isMockFallback?: boolean;
  fallbackReason?: string;
}

/* ==========================================
   STAFF PROFILE
========================================== */

export interface AdminStaffRecord {
  id: string;
  firstName: string;
  lastName: string;

  // Existing frontend fields
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

  // WhalesVault backend fields
  activeChats?: number;
  updatedAt?: string;
}

/* ==========================================
   CREATE STAFF
========================================== */

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  department: string;
  maxChats: number;
}

/* ==========================================
   UPDATE STAFF
========================================== */

export interface UpdateStaffInput {
  firstName?: string;
  lastName?: string;
  username?: string;
  department?: string;
  role?: string;
  maxChats?: number;
  accountStatus?: AdminAccountStatus;

  // Supported by frontend; backend must validate
  availability?: AdminAvailabilityEnum;
}

/* ==========================================
   ADMIN CHAT MESSAGE
========================================== */

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

/* ==========================================
   ADMIN CONVERSATION
========================================== */

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

/* ==========================================
   ADMIN TICKET WHISPER NOTES
========================================== */

export interface AdminTicketWhisperNote {
  id: string;
  ticketId: string;

  authorId: string;
  authorName: string;

  content: string;
  isWhisper: boolean;

  createdAt: string;
}

/* ==========================================
   ADMIN SUPPORT TICKET
========================================== */

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

/* ==========================================
   ADMIN ACTIVITY
========================================== */

export interface AdminActivityItem {
  id: string;

  type:
    | 'escalation'
    | 'assignment'
    | 'queue'
    | 'staff'
    | 'ticket';

  title: string;
  detail: string;
  timestamp: string;

  relatedConversationId?: string;
  relatedTicketId?: string;
}

/* ==========================================
   DEPARTMENT METRICS
========================================== */

export interface AdminDepartmentMetric {
  department: string;
  activeConversations: number;
  openTickets: number;
  onlineStaff: number;
}

/* ==========================================
   ADMIN DASHBOARD OVERVIEW
========================================== */

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

/* ==========================================
   AI ASSISTANCE
========================================== */

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

/* ==========================================
   ADMIN NOTIFICATION PREFERENCES
========================================== */

export interface AdminNotificationPreferences {
  escalationAlerts: boolean;
  unassignedQueueAlerts: boolean;
  staffStatusAlerts: boolean;
  slaBreachWarnings: boolean;
  desktopNotifications: boolean;
}

/* ==========================================
   WHALESVAULT BACKEND RESPONSE TYPES
========================================== */

/**
 * Raw admin identity returned by the backend.
 * This is separate from the frontend AdminProfile.
 */
export interface WhalesVaultAdminResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  accessLevel: string;
  permissions: AdminPermissions;
}

/**
 * Raw staff record returned by the backend.
 */
export interface WhalesVaultStaffResponse {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  department: string;
  role: string;
  availability: AdminAvailabilityEnum;
  activeChats: number;
  maxChats: number;
  createdAt?: string;
  updatedAt?: string;
  accountStatus?: AdminAccountStatus;
}

/* ==========================================
   BACKEND → FRONTEND MAPPERS
========================================== */

/**
 * Converts a WhalesVault admin response into the
 * structure expected by existing Admin components.
 */
export function mapAdminProfile(
  admin: WhalesVaultAdminResponse
): AdminProfile {
  const name =
    `${admin.firstName} ${admin.lastName}`.trim();

  const initials =
    `${admin.firstName.charAt(0)}${admin.lastName.charAt(0)}`
      .toUpperCase();

  return {
    ...admin,
    name,
    initials,
  };
}

/**
 * Converts WhalesVault staff data into the
 * structure expected by existing Admin components.
 */
export function mapAdminStaffRecord(
  staff: WhalesVaultStaffResponse
): AdminStaffRecord {
  return {
    ...staff,

    fullName:
      `${staff.firstName} ${staff.lastName}`.trim(),

    activeConversationsCount: staff.activeChats,

    accountStatus: staff.accountStatus ?? 'ACTIVE',
  };
}