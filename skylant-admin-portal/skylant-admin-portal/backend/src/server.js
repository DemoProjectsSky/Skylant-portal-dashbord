require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const connectDatabase = require("./config/db");
const authRoutes = require("./routes/auth");
const leadRoutes = require("./routes/leads");
const resourceRoutes = require("./routes/resources");
const dashboardRoutes = require("./routes/dashboard");
const managerRoutes = require("./routes/manager");
const userRoutes = require("./routes/users");
const activityRoutes = require("./routes/activity");
const groupRoutes = require("./routes/groups");
const referralRoutes = require("./routes/referrals");
const publicRoutes = require("./routes/public");
const dailyReportRoutes = require("./routes/dailyReports");
const chatRoutes = require("./routes/chat");
const importExportRoutes = require("./routes/importExportFiles");
const attendanceRoutes = require("./routes/attendance");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174")
	.split(",")
	.map((value) => value.trim())
	.filter(Boolean);
const corsOptions = {
	origin(origin, callback) {
		if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
		return callback(Object.assign(new Error(`CORS origin not allowed: ${origin}`), { status: 403, code: "CORS_ORIGIN_NOT_ALLOWED" }));
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	optionsSuccessStatus: 204,
};

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true }), authRoutes);
app.get("/api/health", (req, res) => res.json({ success: true, message: "Backend is running", database: mongoose.connection.readyState === 1 ? "connected" : "not_connected" }));
app.use("/api/public", publicRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/users", userRoutes);
app.use("/api", activityRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/daily-reports", dailyReportRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/files", importExportRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api", resourceRoutes);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 5000);
connectDatabase().then(() => app.listen(port, () => console.log(`Skylant API running on port ${port}`))).catch((error) => { console.error(error); process.exit(1); });

module.exports = app;
