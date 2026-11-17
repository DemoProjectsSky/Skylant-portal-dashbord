// READ-ONLY audit: finds old / localhost / wrong-host URLs stored in MongoDB.
// It never writes, updates or deletes anything.
//
// Usage (from backend/):  MONGODB_URI="<atlas uri>" node scripts/audit-urls.js
// (or put MONGODB_URI in a local .env file)
require("dotenv").config();
const mongoose = require("mongoose");
const { portalBaseUrl } = require("../src/config/urls");

const SUSPICIOUS = [/localhost/i, /127\.0\.0\.1/, /onrender\.com/i];
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

function walk(value, path, hits) {
  if (typeof value === "string") {
    for (const url of value.match(URL_PATTERN) || []) {
      const wrongPortal = /\/r\/[A-Za-z0-9]+/.test(url) && !url.startsWith(portalBaseUrl);
      const suspicious = SUSPICIOUS.some((p) => p.test(url)) && !url.startsWith(portalBaseUrl) && !url.startsWith("https://skylant-crm-api.onrender.com");
      if (wrongPortal || suspicious) hits.push({ path, url });
    }
  } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, hits));
  else if (value && typeof value === "object" && !(value instanceof Date) && !value._bsontype) {
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, hits);
  }
}

(async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`Expected frontend base URL: ${portalBaseUrl}\n`);
  const collections = await mongoose.connection.db.listCollections().toArray();
  let total = 0;
  for (const { name } of collections) {
    let count = 0;
    for await (const doc of mongoose.connection.db.collection(name).find({})) {
      const hits = [];
      walk(doc, "", hits);
      for (const hit of hits) {
        count += 1;
        console.log(`[${name}] _id=${doc._id} field=${hit.path} -> ${hit.url}`);
      }
    }
    total += count;
  }
  console.log(total ? `\nFound ${total} URL(s) that look old/incorrect. Nothing was changed.` : "\nNo old or localhost URLs found in the database.");
  await mongoose.disconnect();
})().catch((error) => { console.error("Audit failed:", error.message); process.exit(1); });