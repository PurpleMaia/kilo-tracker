// Re-export shared types
export type { SystemRole, UserRole, AuthUser, KiloEntry, UserProfile } from '@kilo/shared/types';

// Alias for backwards compatibility
export type { UserRole as OrgRole } from '@kilo/shared/types';

// Mobile-specific types
export interface Profile {
  id: number;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  mokupuni: string | null;
  mauna: string | null;
  aina: string | null;
  wai: string | null;
  kula: string | null;
  role: "admin" | "worker" | null;
}

export interface ApiError {
  error: string;
  issues?: unknown[];
}
