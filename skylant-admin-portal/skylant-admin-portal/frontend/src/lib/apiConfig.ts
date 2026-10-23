// Single source of truth for the backend API base URL.
// - Production build  : defaults to the deployed Render API (override with VITE_API_URL).
// - Local development : defaults to http://localhost:5001 (override with VITE_API_URL in .env).
const PRODUCTION_API_URL = "https://skylant-crm-api.onrender.com";
const LOCAL_API_URL = "http://localhost:5001";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim() || (import.meta.env.PROD ? PRODUCTION_API_URL : LOCAL_API_URL);

export const apiUrl = (/^https?:\/\//i.test(configuredApiUrl) ? configuredApiUrl : `https://${configuredApiUrl}`).replace(/\/+$/, "");