export type StaffAvailability = 'online' | 'busy' | 'away' | 'offline';

export type SupportDepartment =
  | 'Private Wealth'
  | 'Treasury & Wires'
  | 'Card Concierge'
  | 'Security & Compliance'
  | 'Institutional Lending';

export interface SupportAgent {
  id: string;
  name: string;
  role: string;
  department: SupportDepartment;
  specialization: string;
  avatarUrl?: string;
  initials: string;
  status: StaffAvailability;
  availability?: StaffAvailability;
  online?: boolean;
  responseTime: string;
  license: string;
  office: string;
  directPhone: string;
  email: string;
  activeConversationsCount: number;
  activeChatsCount?: number;
  availabilityLabel: string;
  rating?: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  clientTier: string;
  kycLevel: string;
  accountNumberMasked: string;
  avatarUrl?: string;
  balanceUSD?: number;
  assignedStaffId?: string;
  joinedYear?: string;
  primaryJurisdiction?: string;
}

export interface SupportAttachment {
  name: string;
  size: string;
  type: 'pdf' | 'receipt' | 'image' | 'document';
  url?: string;
}

export interface VoiceNoteData {
  durationSeconds: number;
  audioUrl?: string;
  waveform?: number[];
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'agent' | 'system';
  agentId?: string;
  agentName?: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  attachment?: SupportAttachment;
  voiceNote?: VoiceNoteData;
  isPrivateNote?: boolean;
  aiSuggested?: boolean;
}

export type InquiryCategory = 'Transfers' | 'Account Issues' | 'Security' | 'General Support';

export interface SupportConversation {
  id: string;
  agent: SupportAgent;
  customerId: string;
  customerName: string;
  customerTier: string;
  customerAvatar?: string;
  subject: string;
  department: string;
  category: InquiryCategory;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  status: 'active' | 'resolved' | 'pending';
  linkedTicketId?: string;
  internalNotes?: string | string[];
  messages: SupportMessage[];
  createdAt?: string;
}

export type TicketPriority = 'Urgent' | 'High' | 'Normal';
export type TicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Escalated';

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'Wire Clearance' | 'Limit Increase' | 'Card Services' | 'Tax & Statements' | 'Custody & Escrow';
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
}

export interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: 'Greetings' | 'Wires & Transfers' | 'Security & KYC' | 'Hold & Verification' | 'Closing';
}

export type UserPortalRole = 'CLIENT' | 'STAFF' | 'ADMIN';

export interface SupportAnalytics {
  totalActiveChats: number;
  totalPendingTickets: number;
  totalResolvedToday: number;
  avgResponseTime: string;
  csatScore: number;
  categoryBreakdown: {
    category: InquiryCategory;
    count: number;
    percentage: number;
  }[];
}

// -----------------------------------------------------------------------------
// AI Chat & Copilot Types (Backend-Ready)
// -----------------------------------------------------------------------------
export type AiRole = 'user' | 'assistant' | 'system';

export type AiActionType =
  | 'chat'
  | 'suggest_reply'
  | 'summarize'
  | 'improve_draft'
  | 'recommend_step';

export interface AiChatMessage {
  id: string;
  conversationId: string;
  role: AiRole;
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  actionType?: AiActionType;
  errorMessage?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    confidence?: number;
    referencedConversationId?: string;
  };
}

export interface AiChatConversation {
  id: string;
  title: string;
  scope: 'client' | 'staff';
  userId: string;
  linkedSupportConversationId?: string;
  linkedSupportSubject?: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
}

export interface AiAssistantResult {
  action: AiActionType;
  title: string;
  content: string;
  metadata?: {
    confidence?: number;
    tokensEstimated?: number;
    referencedMessagesCount?: number;
    model?: string;
  };
}

export interface AiSendMessagePayload {
  conversationId: string;
  message: string;
  scope: 'client' | 'staff';
  history: Pick<AiChatMessage, 'role' | 'content' | 'timestamp'>[];
  context?: {
    supportConversationId?: string;
    customerName?: string;
    customerTier?: string;
    subject?: string;
    category?: InquiryCategory;
    supportMessages?: Pick<SupportMessage, 'sender' | 'text' | 'timestamp'>[];
    staffName?: string;
    staffRole?: string;
  };
}

export interface AiSendMessageResponse {
  conversationId: string;
  userMessage?: AiChatMessage;
  assistantMessage: AiChatMessage;
  suggestedTitle?: string;
}

