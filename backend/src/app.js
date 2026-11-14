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
const storyRoutes = require("./routes/storyRoutes");
const closeFriendsRoutes = require("./routes/closeFriendsRoutes");
const billingRoutes = require("./routes/billingRoutes");
const dailyQuestionRoutes = require("./routes/dailyQuestionRoutes");
const shareRoutes = require("./routes/shareRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { corsOptions, securityHeaders } = require("./config/security");
const { SERVABLE_EXTENSIONS } = require("./utils/uploadTypes");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors(corsOptions));

// Razorpay webhook needs the raw body â€” signature is HMAC over exact bytes.
// Must be mounted BEFORE express.json(), which would parse and consume it.
app.use("/billing/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos, videos and voice notes.
// Uploads share the app's origin, so a file that runs script here could
// read a member's login. Only the media extensions uploads are saved with
// are served at all (anything else, including a bad file from before
// utils/uploadTypes.js existed, is a 404), and every response tells the
// browser to treat it as an inert sandbox even if opened directly.
app.use("/uploads", (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (!SERVABLE_EXTENSIONS.has(ext)) return res.status(404).json({ error: "Not found" });
  res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
  next();
});
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"), { dotfiles: "deny", index: false }),
);

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
app.use("/posts", postRoutes);
app.use("/stories", storyRoutes);
app.use("/close-friends", closeFriendsRoutes);
app.use("/music", require("./routes/musicRoutes"));
app.use("/client-errors", require("./routes/clientErrorRoutes"));
app.use("/billing", billingRoutes);
app.use("/daily-question", dailyQuestionRoutes);
app.use("/share", shareRoutes);
app.use("/admin", adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;

