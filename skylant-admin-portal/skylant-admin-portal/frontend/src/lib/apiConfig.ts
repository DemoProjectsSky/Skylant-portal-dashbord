const configuredApiUrl = import.meta.env.VITE_API_URL?.trim() || "http://localhost:5001";

export const apiUrl = (/^https?:\/\//i.test(configuredApiUrl) ? configuredApiUrl : `https://${configuredApiUrl}`).replace(/\/+$/, "");
