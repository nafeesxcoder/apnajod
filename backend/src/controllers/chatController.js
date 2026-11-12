const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const chatService = require('../services/chatService');
const env = require('../config/env');
const gifService = require('../services/gifService');

const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file was received');
  const apiBase = /localhost|127\.0\.0\.1/.test(env.apiUrl || "") ? `${req.get("x-forwarded-proto") || req.protocol}://${req.get("host")}` : env.apiUrl;
  const publicUrl = `${apiBase}/uploads/chat/${req.file.filename}`;
  res.json({ ok: true, url: publicUrl, mimeType: req.file.mimetype });
});

const gifStatus = asyncHandler(async (_req, res) => {
  res.json({ ok: true, configured: gifService.isConfigured(), provider: 'GIPHY' });
});

const searchGifs = asyncHandler(async (req, res) => {
  try {
    const page = await gifService.searchGifs({
      query: req.query.q,
      offset: req.query.offset,
      limit: req.query.limit,
    });
    res.json({ ok: true, ...page });
  } catch (err) {
    throw new ApiError(err.status || 502, err.message || 'GIF search failed');
  }
});

function wrap(fn) {
  return asyncHandler(async (req, res) => {
    try {
      const data = await fn(req);
      res.json({ ok: true, saved: true, reason: 'backend', data });
    } catch (error) {
      throw new ApiError(error.status || 500, error.message || 'Request failed');
    }
  });
}

const getMessages = wrap(async (req) => {
  const since = req.query.since ? Number(req.query.since) : undefined;
  const messages = await chatService.listMessages(req.params.conversationId, req.user.id, since);
  return messages;
});

const postMessage = wrap(async (req) => {
  const message = req.body;
  if (!message || typeof message !== 'object' || typeof message.id !== 'string')
    throw new ApiError(400, 'A valid message object with an id is required');
  return chatService.sendMessage(req.params.conversationId, req.user.id, message);
});

const postDateProposal = wrap(async (req) => {
  return chatService.createDateProposal(req.params.conversationId, req.user.id, req.body);
});

const putDatePlanStatus = wrap(async (req) => {
  const { proposalId, status } = req.body;
  if (!['proposed', 'accepted', 'declined', 'cancelled'].includes(status))
    throw new ApiError(400, 'Invalid status');
  return chatService.updateDatePlanStatus(req.user.id, proposalId, status);
});

const postLocation = wrap(async (req) => {
  const { location, clientActionId } = req.body;
  if (!location || !clientActionId) throw new ApiError(400, 'location and clientActionId are required');
  return chatService.shareLiveLocation(req.params.conversationId, req.user.id, location, clientActionId);
});

const putEditMessage = wrap(async (req) => {
  const { text } = req.body;
  if (typeof text !== 'string') throw new ApiError(400, 'text is required');
  return chatService.editMessage(req.params.conversationId, req.user.id, req.params.messageId, text);
});

const deleteMessageHandler = wrap(async (req) => {
  return chatService.deleteMessage(req.params.conversationId, req.user.id, req.params.messageId);
});

const putMessageState = wrap(async (req) => {
  return chatService.setMessageState(req.params.conversationId, req.user.id, req.params.messageId, req.body);
});

// The 🔥 count for the open chat. Only for someone in it.
const getStreak = wrap(async (req) => {
  const peerId = req.params.conversationId;
  await chatService.assertParticipant(peerId, req.user.id);
  const streakService = require('../services/streakService');
  return streakService.forConversation(req.user.id, chatService.storageKey(req.user.id, peerId));
});

const getPresence = wrap(async (req) => {
  return chatService.getPartnerPresence(req.params.conversationId, req.user.id);
});

const postTyping = wrap(async (req) => {
  return chatService.setTyping(req.params.conversationId, req.user.id, !!req.body?.typing);
});

const getSettingsHandler = wrap(async (req) => {
  return chatService.getSettings(req.params.conversationId, req.user.id);
});

const putSettingsHandler = wrap(async (req) => {
  return chatService.saveSettings(req.params.conversationId, req.user.id, req.body);
});

// Chat games. See gameService / gameRules.
const startGame = asyncHandler(async (req, res) => {
  const gameService = require('../services/gameService');
  const game = await gameService.start(
    req.user.id,
    req.params.conversationId,
    req.body?.kind,
    req.body?.setup,
  );
  res.json({ ok: true, game });
});

const getGame = asyncHandler(async (req, res) => {
  const gameService = require('../services/gameService');
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, game: await gameService.get(req.params.gameId, req.user.id) });
});

const playGame = asyncHandler(async (req, res) => {
  const gameService = require('../services/gameService');
  const game = await gameService.play(req.params.gameId, req.user.id, req.body?.move);
  res.json({ ok: true, game });
});

const knowMeSetup = asyncHandler(async (req, res) => {
  const gameService = require('../services/gameService');
  res.json({ ok: true, questions: gameService.knowMeSetup() });
});

// Opening lines for an empty chat, built from what the two share.
const getIcebreakers = asyncHandler(async (req, res) => {
  const icebreakerService = require('../services/icebreakerService');
  const lines = await icebreakerService.forPair(req.user.id, req.params.conversationId);
  res.json({ ok: true, lines });
});

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.listConversations(req.user.id);
  res.json({ ok: true, conversations });
});

module.exports = {
  startGame,
  getGame,
  playGame,
  knowMeSetup,
  getIcebreakers,
  listConversations,
  getMessages,
  postMessage,
  postDateProposal,
  putDatePlanStatus,
  postLocation,
  getPresence,
  getStreak,
  postTyping,
  putEditMessage,
  deleteMessageHandler,
  putMessageState,
  getSettingsHandler,
  putSettingsHandler,
  uploadMedia,
  gifStatus,
  searchGifs,
};