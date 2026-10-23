import { apiUrl } from "./apiConfig";

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = window.localStorage.getItem("skylant-auth-token");
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...options, headers: { ...(!isFormData ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers ?? {}) } });
  } catch {
    throw new Error(`Cannot reach backend at ${apiUrl}. Check that the API is running (Render free instances can take ~1 minute to wake up) and that CORS allows this site.`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "API request failed");
  return (body.data ?? body) as T;
}

export async function apiDownloadFile(path: string, fileName: string): Promise<void> {
  const token = window.localStorage.getItem("skylant-auth-token");
  const response = await fetch(`${apiUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Unable to download file");
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}