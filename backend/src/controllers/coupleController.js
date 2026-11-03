const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const coupleService = require('../services/coupleService');

const searchPartner = asyncHandler(async (req, res) => {
  // Either query param works now — a couple can be found by phone number
  // or by the email address they log in with.
  const { phone, email } = req.query;
  const identifier = (typeof email === 'string' && email.trim()) || (typeof phone === 'string' && phone.trim());
  if (!identifier)
    throw new ApiError(400, 'phone or email query parameter is required');
  const partner = await coupleService.searchByIdentifier(identifier, req.user.id);
  if (!partner) return res.json({ ok: true, found: false });
  res.json({ ok: true, found: true, ...partner });
});

const sendRequest = asyncHandler(async (req, res) => {
  const { memberId } = req.body;
  if (!memberId || typeof memberId !== 'string')
    throw new ApiError(400, 'memberId is required');
  try {
    const request = await coupleService.createRequest(req.user.id, memberId);
    res.json({ ok: true, ...request });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message || 'Could not send request');
  }
});

const respondRequest = asyncHandler(async (req, res) => {
  const { requestId, accept } = req.body;
  if (!requestId || typeof accept !== 'boolean')
    throw new ApiError(400, 'requestId and accept (boolean) are required');
  try {
    const hub = await coupleService.respondToRequest(req.user.id, requestId, accept);
    res.json({ ok: true, ...hub });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message || 'Could not respond to request');
  }
});

const getHub = asyncHandler(async (req, res) => {
  const hub = await coupleService.getHub(req.user.id);
  res.json({ ok: true, ...hub });
});

const setMode = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') throw new ApiError(400, 'enabled (boolean) is required');
  await coupleService.setMode(req.user.id, enabled);
  res.json({ ok: true });
});

const disconnect = asyncHandler(async (req, res) => {
  const { connectionId } = req.body || {};
  await coupleService.disconnectConnection(req.user.id, connectionId);
  res.json({ ok: true, saved: true, reason: 'backend' });
});

const matchContacts = asyncHandler(async (req, res) => {
  const { phones } = req.body || {};
  if (!Array.isArray(phones)) throw new ApiError(400, 'phones (array) is required');
  const matches = await coupleService.matchContacts(req.user.id, phones);
  res.json({ ok: true, matches });
});

const getPartnerProfile = asyncHandler(async (req, res) => {
  try {
    const profile = await coupleService.getPartnerProfile(req.user.id, req.params.connectionId);
    res.json({ ok: true, ...profile });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message || 'Could not load this profile');
  }
});

module.exports = { matchContacts, getPartnerProfile, searchPartner, sendRequest, respondRequest, getHub, setMode, disconnect };
