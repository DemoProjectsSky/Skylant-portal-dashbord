import { supabase } from "./supabase";
import { apiUrl } from "./apiConfig";

export type ManagerLead = {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  assigned_to?: string | null;
  assignedTo?: { fullName?: string } | string | null;
  sharedWebsiteLead?: boolean;
  next_follow_up?: string | null;
  nextFollowUp?: string | null;
  followUpDate?: string | null;
  last_contact?: string | null;
  lastContact?: string | null;
  lastContactedDate?: string | null;
  created_at?: string;
  source?: string;
  mobile?: string;
  collegeId?: string | null;
  college_id?: string | null;
  collegeName?: string | null;
  programName?: string | null;
};

export type ManagerActivity = { _id: string; action: string; module: string; recordId?: string; createdAt: string; user?: { fullName?: string; email?: string } };

export type ManagerGroup = {
  id: string;
  groupName: string;
  collegeName: string;
  status?: string;
  expectedStudents?: number;
  registrations: number;
};

export type CollegeOverview = {
  id: string;
  collegeName: string;
  city?: string;
  status?: string;
  totalLeads: number;
  campaigns: number;
};

export type ManagerTeamMember = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
  assignedLeads: number;
  callsToday: number;
  interested: number;
  followUps: number;
  converted: number;
  pendingFollowUps: number;
  groups: ManagerGroup[];
  totalRegistrations: number;
};

export type ManagerOverview = {
  summary: {
    totalLeads: number;
    statusCounts: Record<string, number>;
    comparisons: Record<string, { current: number; previous: number }>;
  };
  team: ManagerTeamMember[];
  recentLeads: ManagerLead[];
  trend: Array<{ date: string; count: number }>;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = window.localStorage.getItem("skylant-auth-token");
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Manager API request failed");
  return (body.data ?? body) as T;
}

export const getManagerOverview = () => request<ManagerOverview>("/api/manager/overview");
export const getManagerActivity = (limit = 6) => request<ManagerActivity[]>(`/api/activity-logs?limit=${limit}`);

export const updateManagerLead = (
  id: string,
  updates: Pick<ManagerLead, "status" | "assigned_to" | "next_follow_up" | "last_contact">
) => request<ManagerLead>(`/api/leads/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(updates) });

export const getCollegesOverview = () => request<CollegeOverview[]>("/api/colleges-overview");