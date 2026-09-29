import { SupportAgent, SupportConversation, SupportTicket } from '../types/support';

export const SUPPORT_AGENTS: Record<string, SupportAgent> = {
  marcus: {
    id: 'agent-1',
    name: 'Marcus Sterling',
    role: 'Senior VP, Private Banking & Wealth',
    department: 'Private Wealth',
    initials: 'MS',
    status: 'online',
    responseTime: '< 1 min',
    license: 'FINRA Series 7, 66 · Managing Director',
    office: '540 Madison Ave, 28th Floor, New York, NY',
    directPhone: '+1 (212) 555-0199',
    email: 'marcus.sterling@aureusbank.com'
  },
  wire_desk: {
    id: 'agent-2',
    name: 'Eleanor Vance',
    role: 'Managing Officer, Global Wire Clearing',
    department: 'Treasury & Wires',
    initials: 'EV',
    status: 'online',
    responseTime: '< 3 mins',
    license: 'Federal Reserve Fedwire Specialist',
    office: 'Clearing Operations, Zurich / New York',
    directPhone: '+1 (212) 555-0244',
    email: 'clearing.desk@aureusbank.com'
  },
  card_concierge: {
    id: 'agent-3',
    name: 'Julian Croft',
    role: 'Director, Obsidian Lifestyle Concierge',
    department: 'Card Concierge',
    initials: 'JC',
    status: 'online',
    responseTime: '< 2 mins',
    license: 'Les Clefs d’Or International Partner',
    office: 'Mayfair, London & New York',
    directPhone: '+44 20 7946 0991',
    email: 'concierge.obsidian@aureusbank.com'
  },
  security_desk: {
    id: 'agent-4',
    name: 'Dr. Aris Thorne',
    role: 'Head of Information Security & Cryptography',
    department: 'Security & Compliance',
    initials: 'AT',
    status: 'busy',
    responseTime: '< 5 mins',
    license: 'CISSP · Hardware Security Key Officer',
    office: 'Zurich Security Operations Center',
    directPhone: '+41 44 668 1200',
    email: 'infosec@aureusbank.com'
  }
};

export const INITIAL_CONVERSATIONS: SupportConversation[] = [
  {
    id: 'conv-1',
    agent: SUPPORT_AGENTS.marcus,
    subject: 'Quarterly Liquid Yield & Syndicate Carry Sweep',
    department: 'Private Wealth Advisory',
    lastMessage: 'I have logged your instructions with our private treasury desk at 540 Madison Ave. Documents will be ready by 2 PM.',
    lastMessageTimestamp: '10:42 AM',
    unreadCount: 2,
    status: 'active',
    linkedTicketId: 'TKT-8921-NY',
    messages: [
      {
        id: 'm-1',
        conversationId: 'conv-1',
        sender: 'system',
        text: 'Session authenticated. FIDO2 hardware token verified. End-to-end 256-bit encryption active with Marcus Sterling.',
        timestamp: '09:10 AM',
        status: 'read'
      },
      {
        id: 'm-2',
        conversationId: 'conv-1',
        sender: 'agent',
        agentId: 'agent-1',
        text: 'Good morning, Mr. Wright. Marcus Sterling here. Your $25,000 disbursement to Axiom Neural cleared seamlessly this morning. How may my desk assist your portfolio today?',
        timestamp: '09:12 AM',
        status: 'read'
      },
      {
        id: 'm-3',
        conversationId: 'conv-1',
        sender: 'customer',
        text: 'Marcus, could we review the Treasury Yield sweep? I want to allocate an additional $80,000 from the operating checking into the 4.85% APY vault before the close of European trading.',
        timestamp: '09:30 AM',
        status: 'read'
      },
      {
        id: 'm-4',
        conversationId: 'conv-1',
        sender: 'agent',
        agentId: 'agent-1',
        text: 'Certainly, Mr. Wright. At 4.85% APY, that sweep will add approximately +$323.33/month in risk-free yield with zero lockup period. I have drafted the internal allocation order.',
        timestamp: '09:34 AM',
        status: 'read',
        attachment: {
          name: 'Allocation_Order_80K_Treasury.pdf',
          size: '340 KB',
          type: 'pdf'
        }
      },
      {
        id: 'm-5',
        conversationId: 'conv-1',
        sender: 'customer',
        text: 'Approved. Please execute and send over the updated statement summary when complete.',
        timestamp: '10:38 AM',
        status: 'delivered'
      },
      {
        id: 'm-6',
        conversationId: 'conv-1',
        sender: 'agent',
        agentId: 'agent-1',
        text: 'I have logged your instructions with our private treasury desk at 540 Madison Ave. Documents will be ready by 2 PM.',
        timestamp: '10:42 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'conv-2',
    agent: SUPPORT_AGENTS.wire_desk,
    subject: 'Fedwire Clearing #WRE-882941 Status Confirmation',
    department: 'Treasury & Wires',
    lastMessage: 'Federal Reserve reference Fedwire IMAD 20260922MMQF002491 confirmed settled at 16:42:10 EST.',
    lastMessageTimestamp: 'Yesterday',
    unreadCount: 0,
    status: 'resolved',
    linkedTicketId: 'TKT-8840-FED',
    messages: [
      {
        id: 'm-201',
        conversationId: 'conv-2',
        sender: 'system',
        text: 'Fedwire tracking channel initialized. Connected to BNY Mellon clearing node.',
        timestamp: 'Yesterday 16:30',
        status: 'read'
      },
      {
        id: 'm-202',
        conversationId: 'conv-2',
        sender: 'customer',
        text: 'Inquiring regarding settlement receipt for the NetJets flight block transfer ($18,450.00).',
        timestamp: 'Yesterday 16:35',
        status: 'read'
      },
      {
        id: 'm-203',
        conversationId: 'conv-2',
        sender: 'agent',
        agentId: 'agent-2',
        text: 'Federal Reserve reference Fedwire IMAD 20260922MMQF002491 confirmed settled at 16:42:10 EST. Your correspondent account has been credited and flight dispatch authorized.',
        timestamp: 'Yesterday 16:42',
        status: 'read',
        attachment: {
          name: 'Fedwire_IMAD_Confirmation_Receipt.pdf',
          size: '180 KB',
          type: 'receipt'
        }
      }
    ]
  },
  {
    id: 'conv-3',
    agent: SUPPORT_AGENTS.card_concierge,
    subject: 'Obsidian Card Temporary Spending Cap Adjustment',
    department: 'Card Concierge',
    lastMessage: 'Limit temporary increase to $150,000 for London auction acquisition has been activated.',
    lastMessageTimestamp: 'Sep 18',
    unreadCount: 0,
    status: 'resolved',
    linkedTicketId: 'TKT-8799-CC',
    messages: [
      {
        id: 'm-301',
        conversationId: 'conv-3',
        sender: 'customer',
        text: 'Good afternoon Julian, I will be attending an evening sale at Christie’s London tomorrow. Could we elevate the POS threshold on Obsidian Card •• 9012?',
        timestamp: 'Sep 18 14:10',
        status: 'read'
      },
      {
        id: 'm-302',
        conversationId: 'conv-3',
        sender: 'agent',
        agentId: 'agent-3',
        text: 'Limit temporary increase to $150,000 for London auction acquisition has been activated. No additional fraud prompts will disrupt your bidding.',
        timestamp: 'Sep 18 14:15',
        status: 'read'
      }
    ]
  },
  {
    id: 'conv-4',
    agent: SUPPORT_AGENTS.security_desk,
    subject: 'Hardware Security Key (YubiKey 5Ci) Registration',
    department: 'Security & Compliance',
    lastMessage: 'Secondary FIDO2 token #YB-4492 successfully bonded to your client ID.',
    lastMessageTimestamp: 'Aug 30',
    unreadCount: 0,
    status: 'resolved',
    linkedTicketId: 'TKT-8650-SEC',
    messages: [
      {
        id: 'm-401',
        conversationId: 'conv-4',
        sender: 'agent',
        agentId: 'agent-4',
        text: 'Secondary FIDO2 token #YB-4492 successfully bonded to your client ID. Dual-signatory parameters updated.',
        timestamp: 'Aug 30 11:00',
        status: 'read'
      }
    ]
  }
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-8921-NY',
    subject: 'Treasury Reserve Yield Allocation ($80,000 Sweep)',
    category: 'Custody & Escrow',
    priority: 'High',
    status: 'In Review',
    createdAt: '2026-09-23 09:30',
    updatedAt: '2026-09-23 10:42',
    assignedAgent: 'Marcus Sterling',
    description: 'Internal capital sweep from Operating Liquidity to 4.85% APY Treasury Vault with same-day settlement.',
    conversationId: 'conv-1'
  },
  {
    id: 'TKT-8840-FED',
    subject: 'Fedwire IMAD Clearing Confirmation #WRE-882941',
    category: 'Wire Clearance',
    priority: 'Normal',
    status: 'Resolved',
    createdAt: '2026-09-22 16:30',
    updatedAt: '2026-09-22 16:45',
    assignedAgent: 'Eleanor Vance',
    description: 'Outbound Federal Reserve IMAD receipt generation for fractional aviation flight block payment.',
    conversationId: 'conv-2'
  },
  {
    id: 'TKT-8799-CC',
    subject: 'Obsidian Card Daily Limit Temporary Elevation ($150,000)',
    category: 'Limit Increase',
    priority: 'High',
    status: 'Resolved',
    createdAt: '2026-09-18 14:10',
    updatedAt: '2026-09-18 14:20',
    assignedAgent: 'Julian Croft',
    description: 'Temporary 48-hour card authorization cap enhancement for international Christie’s auction item.',
    conversationId: 'conv-3'
  },
  {
    id: 'TKT-8650-SEC',
    subject: 'Dual YubiKey FIDO2 Provisioning & Hardware Audit',
    category: 'Card Services',
    priority: 'Normal',
    status: 'Resolved',
    createdAt: '2026-08-30 10:45',
    updatedAt: '2026-08-30 11:15',
    assignedAgent: 'Dr. Aris Thorne',
    description: 'Cryptographic binding of secondary backup hardware key for multi-million dollar wire authorizations.',
    conversationId: 'conv-4'
  }
];
