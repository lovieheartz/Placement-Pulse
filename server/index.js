require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();

// === MIDDLEWARE ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ✅ Serve static folder for file access
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log('Static file path configured:', path.join(__dirname, "uploads"));

// ✅ Serve NOC uploads specifically
app.use("/uploads/noc", express.static(path.join(__dirname, "uploads", "noc")));

// === MONGODB CONNECTION ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// === ROUTES ===
app.use("/", require("./routes/authRoutes")); // Consider using "/auth" prefix
app.use("/student", require("./routes/studentRoutes"));
app.use("/student-profile", require("./routes/studentProfileRoutes")); // Student profile routes
app.use("/admin", require("./routes/adminRoutes"));
app.use("/faculty", require("./routes/facultyRoutes")); // ✅ Ensures /faculty/:id will work
app.use("/notifications", require("./routes/notificationRoutes")); // Notification routes
app.use("/noc", require("./routes/nocRoutes")); // NOC routes
app.use("/api/resume-analysis", require("./routes/resumeAnalysisRoutes")); // Resume analysis routes
app.use("/api/mock-interview", require("./routes/mockInterviewRoutes")); // AI Mock Interview routes
app.use("/api/interview", require("./routes/openaiInterviewRoutes").router); // OpenAI Realtime Interview routes

// === HEALTH CHECK ===
app.get("/", (req, res) => {
  res.send("✅ Server is up and running");
});

// === SCHEDULE JOBS ===
const { scheduleJobs } = require('./jobs/notificationJobs');
const { scheduleReminderJobs } = require('./jobs/deadlineReminderJob');
scheduleJobs();
scheduleReminderJobs();

// === START SERVER WITH WEBSOCKET SUPPORT ===
const PORT = process.env.PORT || 3001;
const http = require('http');
const server = http.createServer(app);

// Initialize OpenAI Realtime Interview WebSocket
const WebSocket = require('ws');
const { setupWebSocket: setupOpenAIWebSocket } = require('./routes/openaiInterviewRoutes');
const interviewWss = new WebSocket.Server({ server, path: '/api/interview/ws' });
setupOpenAIWebSocket(interviewWss);
console.log('✅ OpenAI Realtime Interview WebSocket initialized on /api/interview/ws');

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
