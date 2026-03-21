import type { SageTicketPriority, SageTicketStatus } from '@/types';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
export const APP_NAME = 'Appalix';

export const STATUS_LABELS: Record<SageTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<SageTicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
