const express = require("express");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const router = express.Router();
router.use(requireAuth);
router.get("/me", profileController.getMyProfile);
router.get("/discover", profileController.discoverMatches);
router.put("/profile", profileController.updateProfile);
router.put("/photos", profileController.updatePhotos);
router.post("/verify", profileController.submitVerification);
router.post(
  "/upload-photo",
  upload.single("photo"),
  profileController.uploadPhoto,
);
router.put("/vibes", profileController.updateVibes);
router.put("/intent", profileController.updateIntent);
router.put("/preferences", profileController.updatePreferences);
router.put("/mode", profileController.updateExperienceMode);
router.post("/complete", profileController.completeOnboarding);
module.exports = router;
