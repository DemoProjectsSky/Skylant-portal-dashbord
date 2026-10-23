import { supabase } from "./supabase";
import type { ManagerLead } from "./managerApi";
import { apiUrl } from "./apiConfig";

export type PortalRole = "admin" | "manager" | "sales_executive";

export type PortalProfile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: PortalRole;
  is_active?: boolean;
};

export type SalesOverview = {
  summary: { totalLeads: number; statusCounts: Record<string, number> };
  leads: ManagerLead[];
};

export async function getCurrentProfile(): Promise<PortalProfile | null> {
  const token = window.localStorage.getItem("skylant-auth-token");
  if (token) {
    const response = await fetch(`${apiUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const data = await response.json() as { data?: { user: PortalProfile }; user?: PortalProfile };
    return data.data?.user ?? data.user ?? null;
  }
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data, error } = await supabase.from("profiles").select("id, full_name, email, role, is_active").eq("id", sessionData.session.user.id).maybeSingle();
  if (error) throw error;
  return data as PortalProfile | null;
}

async function salesRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
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
  if (!response.ok) throw new Error(body.message ?? "Sales API request failed");
  return (body.data ?? body) as T;
}

export const getSalesOverview = async () => {
  const leads = await salesRequest<ManagerLead[]>("/api/leads/assigned/me");
  return { summary: { totalLeads: leads.length, statusCounts: leads.reduce<Record<string, number>>((counts, lead) => { const status = lead.status ?? "UNKNOWN"; counts[status] = (counts[status] ?? 0) + 1; return counts; }, {}) }, leads };
};

export const updateSalesLead = (id: string, updates: Pick<ManagerLead, "status" | "next_follow_up" | "last_contact">) =>
  salesRequest<ManagerLead>(`/api/leads/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(updates) });