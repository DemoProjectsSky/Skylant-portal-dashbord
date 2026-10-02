import { apiRequest } from "./api";

export type GroupRecord = {
  _id: string;
  groupName: string;
  collegeName: string;
  collegeLocation?: string;
  ambassador: { name: string; mobile: string; email?: string };
  program: "Training" | "Internship" | "Training + Internship";
  course: string;
  batch: string;
  mode: "Online" | "Offline" | "Hybrid";
  expectedStudents: number;
  whatsappGroupLink?: string;
  description?: string;
  campaignStartDate?: string;
  campaignEndDate?: string;
  status: "Active" | "Paused" | "Completed";
  createdBy?: { fullName?: string; email?: string };
  createdAt: string;
  registrations: number;
  progress: number;
  referralLink: string;
};

export type GroupFilters = { search?: string; salesMember?: string; program?: string; course?: string; status?: string; date?: string };

export const getGroups = (filters: GroupFilters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]).toString();
  return apiRequest<GroupRecord[]>(`/api/groups${query ? `?${query}` : ""}`);
};

export const createGroup = (payload: Omit<GroupRecord, "_id" | "createdAt" | "registrations" | "progress" | "referralLink" | "createdBy">) =>
  apiRequest<GroupRecord>("/api/groups", { method: "POST", body: JSON.stringify(payload) });

export const updateGroup = (id: string, payload: Partial<GroupRecord>) => apiRequest<GroupRecord>(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteGroup = (id: string) => apiRequest<void>(`/api/groups/${id}`, { method: "DELETE" });
export const getRegistrations = (id: string) => apiRequest<Array<{ _id: string; fullName?: string; name?: string; email?: string; phone?: string }>>(`/api/groups/${id}/registrations`);
export const regenerateGroupLink = (id: string) => apiRequest<GroupRecord>(`/api/groups/${id}/regenerate-link`, { method: "POST" });
export const getGroupMembers = () => apiRequest<Array<{ _id: string; fullName: string; email?: string }>>("/api/groups/team-members");
