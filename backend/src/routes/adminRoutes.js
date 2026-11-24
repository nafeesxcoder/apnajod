const express = require("express");
const adminController = require("../controllers/adminController");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/adminAuth");
const musicController = require("../controllers/musicController");
const { musicUpload, coverUpload } = require("../middleware/musicUpload");

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
router.get("/users/:id/pass", adminController.getPass);
router.post("/users/:id/pass", adminController.givePass);
router.delete("/users/:id/pass", adminController.deletePass);
router.get("/users/:id/coins", adminController.getCoins);
router.post("/users/:id/coins", adminController.giveCoins);

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
router.post("/music/:id/lyrics", musicController.setMusicLyrics);
router.post("/music/:id/cover", coverUpload.single("cover"), musicController.setMusicCover);

router.get("/appeals", adminController.getAppeals);
router.post("/appeals/:id/resolve", adminController.resolveAppeal);

// Festival themes on the whole app.
router.get("/festivals", adminController.getFestivals);
router.post("/festivals", adminController.scheduleFestival);
router.post("/festivals/stop", adminController.stopFestival);
router.post("/festivals/push", adminController.pushFestival);
router.post("/festivals/:id/cancel", adminController.cancelFestival);

// Coupons and the offer popup.
router.get("/coupons", adminController.getCoupons);
router.post("/coupons", adminController.createCoupon);
router.post("/coupons/:id", adminController.updateCoupon);
router.get("/promo", adminController.getPromo);
router.post("/promo", adminController.publishPromo);
router.post("/promo/off", adminController.stopPromo);

// Authenticator app sign-in for the admin.
router.get("/2fa", adminController.authenticatorStatus);
router.post("/2fa/setup", adminController.startAuthenticatorSetup);
router.post("/2fa/confirm", adminController.confirmAuthenticatorSetup);
router.post("/2fa/disable", adminController.disableAuthenticator);

// Demo accounts for store and partner reviews: real accounts, flagged, deletable.
router.get("/demo-users", adminController.listDemoUsers);
router.post("/demo-users", adminController.createDemoUser);
router.delete("/demo-users/:id", adminController.deleteDemoUser);

// Plans and boost packs: price, title, on sale, Play product id.
router.get("/plans", adminController.getPlans);
router.post("/plans/:code", adminController.updatePlan);

module.exports = router;
