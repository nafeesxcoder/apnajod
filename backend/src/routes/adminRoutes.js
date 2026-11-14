const express = require("express");
const adminController = require("../controllers/adminController");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/adminAuth");
const musicController = require("../controllers/musicController");
const { musicUpload } = require("../middleware/musicUpload");

const router = express.Router();

// Public routes (Forgot/Reset password ke liye - No auth needed)
router.post("/forgot-password", adminController.forgotAdminPassword);
router.post("/reset-password", adminController.resetAdminPassword);

// Protected routes (Login + Admin required)
router.use(requireAuth);
router.use(requireAdmin);

router.get("/stats", adminController.getStats);
router.get("/growth", adminController.getGrowth);

router.get("/users", adminController.getUsers);
router.post("/users/:id/role", adminController.updateUserRole);
router.post("/users/:id/ban", adminController.banUser);
router.post("/users/:id/unban", adminController.unbanUser);

router.get("/verifications", adminController.getVerifications);
router.post("/verifications/:id/reject", adminController.rejectVerification);
router.post("/verifications/:id/approve", adminController.approveVerification);
router.put("/update-password", adminController.updateAdminPassword);

router.get("/reports", adminController.getReports);
router.post("/reports/:id/resolve", adminController.resolveReport);
router.post("/posts/:id/remove", adminController.removePost);
router.post("/posts/:id/keep", adminController.keepPost);

router.get("/questions", adminController.getQuestions);
router.post("/questions", adminController.createQuestion);
router.post("/questions/:id/active", adminController.setQuestionActive);

// Story music library.
router.get("/music", musicController.listMusic);
router.post("/music", musicUpload.single("audio"), musicController.addMusic);
router.delete("/music/:id", musicController.deleteMusic);
router.post("/music/:id/duration", musicController.setMusicDuration);

router.get("/appeals", adminController.getAppeals);
router.post("/appeals/:id/resolve", adminController.resolveAppeal);

// UPI payments checked by hand.
router.get("/payments", adminController.getPayments);
router.post("/payments/:id/approve", adminController.approvePayment);
router.post("/payments/:id/reject", adminController.rejectPayment);

module.exports = router;
