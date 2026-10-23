const mongoose = require("mongoose");
const dns = require("dns");

if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((server) => server.trim()).filter(Boolean));
}

// Returns only the host part of the URI (never the username/password) so it is safe to log.
function safeHost(uri) {
  const match = String(uri || "").match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/i);
  return match ? match[1] : "(unparseable URI)";
}

// Prints a safe, credential-free hint explaining WHY the Atlas connection failed.
function explainConnectionError(error) {
  const text = `${error?.name || ""} ${error?.codeName || ""} ${error?.message || ""}`;
  const hints = [];
  if (error?.code === 8000 || /bad auth|authentication failed|AtlasError/i.test(text)) {
    hints.push("Atlas rejected the username/password. Check the Database Access user exists, the password is correct, and any special characters in the password are URL-encoded (@ -> %40, : -> %3A, / -> %2F, # -> %23).");
    hints.push("Also confirm the user has read/write access to the database and, if the URI has authSource, that it is correct (Atlas users normally use authSource=admin).");
  }
  if (/ENOTFOUND|querySrv|ECONNREFUSED|EAI_AGAIN/i.test(text)) {
    hints.push("DNS/SRV lookup failed. Re-copy the connection string from Atlas (Connect > Drivers) or set MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8.");
  }
  if (/ServerSelection|timed out|ETIMEDOUT|whitelist|IP/i.test(text) && !hints.length) {
    hints.push("Could not reach the cluster. In Atlas > Network Access, allow Render's outbound IPs (or 0.0.0.0/0 while testing) and make sure the cluster is not paused.");
  }
  if (!hints.length) hints.push("Unknown MongoDB connection error. Check MONGODB_URI formatting in Render > Environment.");
  return hints;
}

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    if (process.env.NODE_ENV === "production") throw new Error("MONGODB_URI is required in production");
    console.warn("MONGODB_URI is not configured; API will start but database routes require MongoDB.");
    return false;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  } catch (error) {
    console.error(`MongoDB connection failed (host: ${safeHost(process.env.MONGODB_URI)})`);
    console.error(`Reason: ${error?.name}${error?.codeName ? ` / ${error.codeName}` : ""}${error?.code ? ` (code ${error.code})` : ""}`);
    explainConnectionError(error).forEach((hint) => console.error(`Hint: ${hint}`));
    throw new Error("Database connection failed");
  }
  console.log("MongoDB connected");
  return true;
}

module.exports = connectDatabase;