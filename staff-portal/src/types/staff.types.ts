import type {
  SupportAgent,
  SupportConversation,
  SupportConversationStatus,
  SupportMessage,
  SupportTicket,
  CustomerProfile,
  CannedResponse,
  InquiryCategory,
  TicketPriority,
  TicketStatus,
  SupportAttachment,
  VoiceNoteData,
  SupportDepartment,
  SupportCallSession,
  SupportCallSignalPayload,
  SupportCallType,
} from '@/src/types/support';

export type {
  SupportAgent,
  SupportConversation,
  SupportConversationStatus,
  SupportMessage,
  SupportTicket,
  CustomerProfile,
  CannedResponse,
  InquiryCategory,
  TicketPriority,
  TicketStatus,
  SupportAttachment,
  VoiceNoteData,
  SupportDepartment,
  SupportCallSession,
  SupportCallSignalPayload,
  SupportCallType,
};

export type StaffAvailabilityEnum = 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';

export type StaffRoute =
  | '/staff/signin'
  | '/staff/invite'
  | '/staff/set-password'
  | '/staff/dashboard'
  | '/staff/conversations'
  | '/staff/tickets'
  | '/staff/availability'
  | '/staff/settings';

export type StaffSidebarMode = 'expanded' | 'collapsed' | 'hover';

export type StaffNavSection =
  | 'overview'
  | 'conversations'
  | 'tickets'
  | 'availability'
  | 'settings';

export interface StaffMemberProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  specialization?: string;
  initials: string;
  avatarUrl?: string;
  availability: StaffAvailabilityEnum;
  maxChats: number;
  activeChatsCount: number;
  license?: string;
  office?: string;
  directPhone?: string;
  responseTime?: string;
  rating?: number;
  lastSeenAt?: string;
}

export interface StaffSessionState {
  staff: StaffMemberProfile;
  expiresAt?: string;
}

export interface InviteVerificationData {
  valid: boolean;
  email?: string;
  name?: string;
  department?: string;
  role?: string;
  expiresAt?: string;
  message?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface StaffChatMessage extends SupportMessage {
  editedAt?: string;
  deletedAt?: string;
  isWhisper?: boolean;
  reactions?: MessageReaction[];
  readByCustomerAt?: string;
  readByStaffAt?: string;
}

export interface StaffConversation extends Omit<SupportConversation, 'messages'> {
  messages: StaffChatMessage[];
  assignedStaffId?: string;
  customerOnline?: boolean;
  customerLastSeenAt?: string;
}

export interface TicketWhisperNote {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  isWhisper: true;
  createdAt: string;
}

export interface StaffTicket extends SupportTicket {
  investigationNotes?: string;
  resolution?: string;
  whisperNotes?: TicketWhisperNote[];
  slaDueAt?: string;
}

export interface StaffActivityItem {
  id: string;
  type: 'message' | 'ticket' | 'availability' | 'assignment';
  title: string;
  detail: string;
  timestamp: string;
  relatedConversationId?: string;
  relatedTicketId?: string;
}

export interface StaffOverviewSummary {
  activeConversations: number;
  pendingConversations: number;
  unreadMessages: number;
  maxChats: number;
  assignedTickets: number;
  openTickets: number;
  resolvedTickets: number;
  availability: StaffAvailabilityEnum;
  recentActivity: StaffActivityItem[];
}

export interface StaffNotificationPreferences {
  newAssignmentAlert: boolean;
  unreadMessageChime: boolean;
  ticketEscalationAlert: boolean;
  whisperMentionAlert: boolean;
  desktopNotifications: boolean;
}

export type AiAssistMode =
  | 'summary'
  | 'suggested_reply'
  | 'improve_draft'
  | 'troubleshooting'
  | 'internal_note';

export interface AiAssistEntry {
  id: string;
  mode: AiAssistMode;
  prompt: string;
  content: string;
  createdAt: string;
  model?: string;
  confidence?: number;
  conversationId: string;
}

export interface CallSessionPayload {
  id: string;
  conversationId: string;
  mode: 'audio' | 'video';
  status: 'ready' | 'signaling_unavailable' | 'ringing' | 'ended';
  providerNote?: string;
}

export interface StaffApiError {
  code: string;
  message: string;
  status?: number;
  field?: string;
  unimplemented?: boolean;
}

export interface StaffApiResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: StaffApiError;
  isMockFallback?: boolean;
  fallbackReason?: string;
}
