export interface SupportAgent {
  id: string;
  name: string;
  role: string;
  department: 'Private Wealth' | 'Treasury & Wires' | 'Card Concierge' | 'Security & Compliance';
  avatarUrl?: string;
  initials: string;
  status: 'online' | 'busy' | 'away';
  responseTime: string;
  license: string;
  office: string;
  directPhone: string;
  email: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'agent' | 'system';
  agentId?: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  attachment?: {
    name: string;
    size: string;
    type: 'pdf' | 'receipt' | 'image';
  };
}

export interface SupportConversation {
  id: string;
  agent: SupportAgent;
  subject: string;
  department: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  status: 'active' | 'resolved' | 'pending';
  linkedTicketId?: string;
  messages: SupportMessage[];
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
  description: string;
  conversationId?: string;
}
