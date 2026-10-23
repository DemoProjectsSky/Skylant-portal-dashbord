import type { PortalProfile, PortalRole } from "./roleApi";
import { apiUrl } from "./apiConfig";

export { apiUrl };

export type AuthResponse = { token: string; user: PortalProfile };

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(`Cannot reach backend at ${apiUrl}. Check that the API is running (Render free instances can take ~1 minute to wake up) and that CORS allows this site.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? "Authentication request failed");
  return (data.data ?? data) as T;
}

export const signUp = (payload: { name: string; email: string; password: string; role: PortalRole }) => request<AuthResponse>("/api/auth/register", payload);
export const signIn = (payload: { email: string; password: string; role: PortalRole }) => request<AuthResponse>("/api/auth/login", payload);

export function saveSession(response: AuthResponse) {
  window.localStorage.setItem("skylant-auth-token", response.token);
  window.localStorage.setItem("skylant-user", JSON.stringify(response.user));
  window.localStorage.removeItem("skylant-local-session");
}

export function clearSession() {
  window.localStorage.removeItem("skylant-auth-token");
  window.localStorage.removeItem("skylant-user");
  window.localStorage.removeItem("skylant-local-session");
}