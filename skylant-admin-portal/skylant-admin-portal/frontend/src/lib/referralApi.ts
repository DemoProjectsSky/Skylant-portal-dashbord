import { apiRequest } from "./api";

export type ReferralPublicContext = {
  referralCode: string;
  referralUrl: string;
  ambassador: { id?: string; fullName?: string; email?: string; phone?: string } | null;
  group: { id?: string; groupName?: string; collegeName?: string; city?: string; state?: string; program?: string; batch?: string; status?: string } | null;
  college: { id?: string; collegeName?: string; city?: string } | null;
  program: { id?: string; programName?: string } | null;
  createdAt?: string;
};

export const getReferralContext = (code: string) => apiRequest<ReferralPublicContext>(`/api/public/referrals/${encodeURIComponent(code)}`);

export const submitRegistration = (payload: Record<string, string | number | undefined>) =>
  apiRequest<{ _id: string; referralCode: string; fullName: string; mobile: string; email?: string }>("/api/public/registrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
