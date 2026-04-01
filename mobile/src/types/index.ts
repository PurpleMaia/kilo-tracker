export type SystemRole = "sysadmin" | "user";
export type OrgRole = "admin" | "member";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  system_role: SystemRole;
}

export interface KiloEntry {
  id: number;
  user_id: string;
  location: string | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  photo_mime_type: string | null;
  created_at: string;
}

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
  role: OrgRole | null;
}

export interface ApiError {
  error: string;
  issues?: unknown[];
}
