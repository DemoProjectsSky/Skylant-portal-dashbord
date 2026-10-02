const mongoose = require("mongoose");
const dns = require("dns");

if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((server) => server.trim()).filter(Boolean));
}

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    if (process.env.NODE_ENV === "production") throw new Error("MONGODB_URI is required in production");
    console.warn("MONGODB_URI is not configured; API will start but database routes require MongoDB.");
    return false;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
  return true;
}

module.exports = connectDatabase;
