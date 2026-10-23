// Central place for every URL the backend needs to know about.
// Nothing here is secret. Override via environment variables on Render.

const isProduction = process.env.NODE_ENV === "production";

const DEFAULT_PORTAL_URL = "https://skylant-portal-dashboard-1.onrender.com";
const LOCAL_ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"];

// Turns "example.com/", "https://example.com/path" -> "https://example.com" (origin only).
function toOrigin(value) {
	const trimmed = String(value || "").trim();
	if (!trimmed) return null;
	try {
		return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).origin;
	} catch {
		console.warn(`Ignoring invalid URL in environment configuration: ${trimmed}`);
		return null;
	}
}

// Frontend (dashboard) base URL: used to build referral links like <portal>/r/<code>.
// Priority: PORTAL_URL -> first CLIENT_URL entry -> deployed default (production) / localhost (dev).
const portalBaseUrl =
	toOrigin(process.env.PORTAL_URL) ||
	toOrigin((process.env.CLIENT_URL || "").split(",")[0]) ||
	(isProduction ? DEFAULT_PORTAL_URL : LOCAL_ORIGINS[0]);

// Browser origins allowed by CORS.
// Production always allows the deployed frontend; localhost origins are only added outside production.
const configuredOrigins = (process.env.CLIENT_URL || "").split(",").map(toOrigin).filter(Boolean);
const allowedOrigins = [...new Set([
	...configuredOrigins,
	portalBaseUrl,
	...(isProduction ? [DEFAULT_PORTAL_URL] : LOCAL_ORIGINS),
])];

const referralUrlFor = (code) => `${portalBaseUrl}/r/${code}`;

module.exports = { portalBaseUrl, allowedOrigins, referralUrlFor, toOrigin };