const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const profileService = require("../services/profileService");
const env = require("../config/env");

const getMyProfile = asyncHandler(async (req, res) => {
  const data = await profileService.getFullProfile(req.user.id);
  res.json({ ok: true, ...data });
});
const updateProfile = asyncHandler(async (req, res) => {
  const {
    firstName,
    gender,
    age,
    height,
    city,
    profession,
    religion,
    community,
    about,
  } = req.body;
  await profileService.upsertProfile(req.user.id, {
    firstName,
    gender,
    age,
    height,
    city,
    profession,
    religion,
    community,
    about,
  });
  res.json({ ok: true });
});
const submitVerification = asyncHandler(async (req, res) => {
  const { selfieUrl } = req.body;
  if (!selfieUrl || typeof selfieUrl !== "string")
    throw new ApiError(400, "selfieUrl is required");
  await profileService.submitVerification(req.user.id, selfieUrl);
  res.json({ ok: true });
});
const updatePhotos = asyncHandler(async (req, res) => {
  const { photos } = req.body;
  if (!Array.isArray(photos))
    throw new ApiError(400, "photos must be an array of URLs");
  await profileService.replacePhotos(req.user.id, photos);
  res.json({ ok: true });
});
const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No photo file was received");
  const publicUrl = `${env.apiUrl}/uploads/photos/${req.file.filename}`;
  res.json({ ok: true, url: publicUrl });
});
const updateVibes = asyncHandler(async (req, res) => {
  const { vibes } = req.body;
  if (!Array.isArray(vibes)) throw new ApiError(400, "vibes must be an array");
  await profileService.replaceVibes(req.user.id, vibes);
  res.json({ ok: true });
});
const updateIntent = asyncHandler(async (req, res) => {
  const { intent, timeline, children, family, relocation } = req.body;
  await profileService.upsertIntent(req.user.id, {
    intent,
    timeline,
    children,
    family,
    relocation,
  });
  res.json({ ok: true });
});
const updatePreferences = asyncHandler(async (req, res) => {
  await profileService.upsertPreferences(req.user.id, req.body);
  res.json({ ok: true });
});
const updateExperienceMode = asyncHandler(async (req, res) => {
  const { mode } = req.body;
  if (!["seeking", "couple"].includes(mode))
    throw new ApiError(400, 'mode must be "seeking" or "couple"');
  await profileService.setExperienceMode(req.user.id, mode);
  res.json({ ok: true });
});
const completeOnboarding = asyncHandler(async (req, res) => {
  await profileService.markOnboardingComplete(req.user.id);
  res.json({ ok: true });
});
const discoverMatches = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const matches = await profileService.findMatches(req.user.id, limit);
  res.json({ ok: true, matches });
});
module.exports = {
  getMyProfile,
  updateProfile,
  submitVerification,
  updatePhotos,
  uploadPhoto,
  updateVibes,
  updateIntent,
  updatePreferences,
  updateExperienceMode,
  completeOnboarding,
  discoverMatches,
};
