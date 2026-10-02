import { apiRequest } from "./api";

export type DailyReport = {
  id: string;
  salesExecutiveId: string;
  salesExecutiveName: string;
  email?: string;
  date: string;
  leadsAssigned: number;
  callsMade: number;
  connected: number;
  interested: number;
  followUps: number;
  converted: number;
  whatsappConversations: number;
  remarks: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DailyReportsResponse = {
  reports: DailyReport[];
  summary: { submitted: number; pending: number; totalSalesExecutives: number };
};

export type DailyReportFilters = { search?: string; date?: string; from?: string; to?: string; status?: string; salesExecutiveId?: string };

export const getDailyReports = (filters: DailyReportFilters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]).toString();
  return apiRequest<DailyReportsResponse>(`/api/daily-reports${query ? `?${query}` : ""}`);
};

export const getDailyReport = (id: string) => apiRequest<DailyReport>(`/api/daily-reports/${encodeURIComponent(id)}`);

export const submitDailyReport = (payload: Omit<DailyReport, "id" | "salesExecutiveId" | "salesExecutiveName" | "email" | "status" | "createdAt" | "updatedAt">) =>
  apiRequest<DailyReport>("/api/daily-reports", { method: "POST", body: JSON.stringify(payload) });

export type SalesReportPerformance = { status: "pending" | "submitted"; report: DailyReport | null; leadStats: { leadsAssigned: number; interested: number; converted: number; followUps: number } };
export const getSalesReportPerformance = () => apiRequest<SalesReportPerformance>("/api/daily-reports/performance/today");
