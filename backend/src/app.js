const path = require("path");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const matchRoutes = require("./routes/matchRoutes");
const coupleRoutes = require("./routes/coupleRoutes");
const chatRoutes = require("./routes/chatRoutes");
const pushRoutes = require("./routes/pushRoutes");
const callRoutes = require("./routes/callRoutes");
const safetyRoutes = require("./routes/safetyRoutes");
const followRoutes = require("./routes/followRoutes");
const postRoutes = require("./routes/postRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { corsOptions, securityHeaders } = require("./config/security");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Mount routes
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/matches", matchRoutes);
app.use("/couple", coupleRoutes);
app.use("/chat", chatRoutes);
app.use("/push", pushRoutes);
app.use("/calls", callRoutes);
app.use("/safety", safetyRoutes);
app.use("/social", followRoutes);
app.use("/posts", postRoutes); // <-- YEH 404 HANDLER KE PEHLE HONA CHAHIYE

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
