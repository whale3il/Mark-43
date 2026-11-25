import { apiRequest, type ApiResponse } from './apiClient';
import type { SupportAgent, SupportDepartment, StaffAvailability } from '../types/support';

type BackendStaff = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  availability: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';
  activeChats: number;
  maxChats: number;
  jobTitle: string | null;
  specialty: string | null;
  office: string | null;
  credentials: string | null;
  directPhone: string | null;
};

const mapStaff = (s: BackendStaff): SupportAgent => {
  const name = `${s.firstName} ${s.lastName}`.trim();
  const status = s.availability.toLowerCase() as StaffAvailability;
  return {
    id: s.id,
    name,
    initials: `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase(),
    email: s.email,
    role: s.jobTitle || 'Support Specialist',
    department: s.department as SupportDepartment,
    specialization: s.specialty || '',
    status,
    availability: status,
    online: status === 'online',  
    activeConversationsCount: s.activeChats,
    activeChatsCount: s.activeChats,
    responseTime: '—',
    license: s.credentials || '',
    office: s.office || '',
    directPhone: s.directPhone || '',
    availabilityLabel: status.toUpperCase(),
  };
};

/** No mock-data fallback: an empty directory means no registered staff. */
export async function getSupportStaffDirectory(): Promise<ApiResponse<SupportAgent[]>> {
  const response = await apiRequest<BackendStaff[]>('/support/staff');
  if (!response.success || !Array.isArray(response.data)) {
    return { success: false, error: response.error || 'Invalid staff directory response.' };
  }
  return { success: true, data: response.data.map(mapStaff) };
}
