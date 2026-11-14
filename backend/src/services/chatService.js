const crypto = require("crypto");
const { query } = require("../config/db");
const pushService = require("./pushService");
const realtime = require("./realtime");
const followService = require("./followService");

/**
 * A direct conversation is addressed by the OTHER person's user id, which is
 * convenient for callers but cannot be what it is stored under: each side
 * would then write under a different id and neither would see the other's
 * messages after a reload. Storage uses a stable key built from both ids.
 */
function storageKey(a, b) {
  return `dm:${[a, b].sort().join(":")}`;
}

/** The id a given viewer addresses this conversation by. */
function addressFor(participants, viewerId) {
  return participants.find((pid) => pid !== viewerId) || viewerId;
}

/**
 * May `userId` open a conversation with `peerId`?
 *
 * The permission rule lives in followService.canMessage(), which now only
 * allows a mutual match (blocks still win). The error text is deliberately
 * generic — an attacker should not be able to tell "no match" from "blocked"
 * from "user does not exist" by reading it.
 */
async function assertParticipant(peerId, userId) {
  const permission = await followService.canMessage(userId, peerId);
  if (permission.allowed) return [userId, peerId];

  const err = new Error("This conversation is not available.");
  err.status = 403;
  throw err;
}

/**
 * Same as assertParticipant, but takes a storage conversation id
 * ("dm:<idA>:<idB>") instead of a peer id. Useful in code paths that
 * already have a conversation id (date proposals, etc.).
 */
async function assertParticipantByConversationId(conversationId, userId) {
  const parts = String(conversationId || "").split(":");
  if (parts.length !== 3 || parts[0] !== "dm") {
    const err = new Error("This conversation is not available.");
    err.status = 403;
    throw err;
  }
  const [, a, b] = parts;
  if (a !== userId && b !== userId) {
    const err = new Error("This conversation is not available.");
    err.status = 403;
    throw err;
  }
  const peerId = a === userId ? b : a;
  return assertParticipant(peerId, userId);
}

function parseJsonColumn(value, fallback) {
  if (value === null || value === undefined) return fallback;
  return typeof value === "string" ? JSON.parse(value) : value;
}

/**
 * What a message looks like to one person: a date card's "I'm safe" for
 * them, a poll's counts and their own vote. The raw lists of who did what
 * never leave the server.
 */
function viewerExtras(payload, viewerId) {
  const out = {};
  if (payload.date) {
    const safeBy = Array.isArray(payload.date.safeBy) ? payload.date.safeBy : [];
    const { safeBy: _hidden, ...date } = payload.date;
    out.date = { ...date, safeByMe: safeBy.includes(viewerId), safeCount: safeBy.length };
  }
  if (payload.poll && Array.isArray(payload.poll.options)) {
    const votes = payload.poll.votes && typeof payload.poll.votes === "object" ? payload.poll.votes : {};
    const counts = payload.poll.options.map((_, i) => Object.values(votes).filter((v) => Number(v) === i).length);
    const mine = Object.prototype.hasOwnProperty.call(votes, viewerId) ? Number(votes[viewerId]) : null;
    out.poll = { question: payload.poll.question, options: payload.poll.options, counts, myVote: mine };
  }
  return out;
}

function rowToMessage(row, viewerId) {
  const payload = parseJsonColumn(row.payload, {});
  const starredBy = parseJsonColumn(row.starred_by, []);
  const hiddenBy = parseJsonColumn(row.hidden_by, []);
  const reactionsMap = parseJsonColumn(row.reactions, {});
  return {
    ...payload,
    ...viewerExtras(payload, viewerId),
    id: row.id,
    senderId: row.sender_id,
    mine: row.sender_id === viewerId,
    status: row.status,
    createdAt: Number(row.created_at_ms),
    starredByMe: starredBy.includes(viewerId),
    hiddenForMe: hiddenBy.includes(viewerId),
    pinnedAt: row.pinned_at ? new Date(row.pinned_at).getTime() : undefined,
    reactions: (() => {
      const mine = reactionsMap[viewerId];
      const otherId = Object.keys(reactionsMap).find((id) => id !== viewerId);
      const partner = otherId ? reactionsMap[otherId] : undefined;
      if (!mine && !partner) return undefined;
      const result = {};
      if (mine) result.me = mine;
      if (partner) result.partner = partner;
      return result;
    })(),
    editedAt: row.edited_at
      ? new Date(row.edited_at).getTime()
      : payload.editedAt,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    deletedForEveryone: !!row.deleted_for_everyone,
  };
}

// Push a changed message (edit / delete / reaction) to both participants,
// each rendered from their own point of view (mine, reactions, stars).
async function emitMessageUpdate(peerId, row, actingUserId) {
  try {
    const participants = await assertParticipant(peerId, actingUserId);
    participants.forEach((pid) =>
      realtime.emitToUser(pid, "message:update", {
        conversationId: addressFor(participants, pid),
        message: rowToMessage(row, pid),
      }),
    );
  } catch {
    /* realtime is best-effort */
  }
}

/**
 * Load a message the caller is allowed to see. The first argument is the
 * peer id (the other person), matching every other public function in this
 * module.
 */
async function getOwnedMessage(peerId, userId, messageId) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  const rows = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, conversationId],
  );
  if (!rows.length) {
    const err = new Error("Message not found");
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function editMessage(peerId, userId, messageId, text) {
  const conversationId = storageKey(userId, peerId);
  const row = await getOwnedMessage(peerId, userId, messageId);
  if (row.sender_id !== userId) {
    const err = new Error("You can only edit your own messages.");
    err.status = 403;
    throw err;
  }
  if (row.deleted_at) {
    const err = new Error("This message has been deleted.");
    err.status = 400;
    throw err;
  }
  const payload = parseJsonColumn(row.payload, {});
  payload.text = text;
  await query(
    "UPDATE chat_messages SET payload = ?, edited_at = NOW(6), updated_at_ms = ? WHERE id = ? AND conversation_id = ?",
    [JSON.stringify(payload), Date.now(), messageId, conversationId],
  );
  const [updated] = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, conversationId],
  );
  emitMessageUpdate(peerId, updated, userId);
  return rowToMessage(updated, userId);
}

const CLEARED_PAYLOAD = {
  text: undefined,
  uri: undefined,
  snap: undefined,
  sticker: undefined,
  voice: undefined,
  document: undefined,
  location: undefined,
  date: undefined,
  linkPreview: undefined,
};

async function softDeleteMessages(conversationId, ids) {
  if (!ids.length) return;
  await query(
    `UPDATE chat_messages SET payload = ?, deleted_at = NOW(6), deleted_for_everyone = 1, updated_at_ms = ?
     WHERE conversation_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
    [JSON.stringify(CLEARED_PAYLOAD), Date.now(), conversationId, ...ids],
  );
}

async function deleteMessage(peerId, userId, messageId) {
  const conversationId = storageKey(userId, peerId);
  const row = await getOwnedMessage(peerId, userId, messageId);
  if (row.sender_id !== userId) {
    const err = new Error("You can only delete your own messages.");
    err.status = 403;
    throw err;
  }
  await softDeleteMessages(conversationId, [messageId]);
  const [updated] = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, conversationId],
  );
  emitMessageUpdate(peerId, updated, userId);
  return rowToMessage(updated, userId);
}

async function setMessageState(peerId, userId, messageId, input) {
  const conversationId = storageKey(userId, peerId);
  const row = await getOwnedMessage(peerId, userId, messageId);
  let starredBy = parseJsonColumn(row.starred_by, []);
  if (typeof input.starred === "boolean") {
    starredBy = input.starred
      ? [...new Set([...starredBy, userId])]
      : starredBy.filter((id) => id !== userId);
  }
  let hiddenBy = parseJsonColumn(row.hidden_by, []);
  if (typeof input.hidden === "boolean") {
    hiddenBy = input.hidden
      ? [...new Set([...hiddenBy, userId])]
      : hiddenBy.filter((id) => id !== userId);
  }
  let pinnedAt = row.pinned_at;
  if (typeof input.pinned === "boolean") {
    pinnedAt = input.pinned ? new Date() : null;
  }
  const reactionsMap = parseJsonColumn(row.reactions, {});
  if (input.reaction !== undefined) {
    if (input.reaction) reactionsMap[userId] = input.reaction;
    else delete reactionsMap[userId];
  }
  await query(
    "UPDATE chat_messages SET starred_by = ?, hidden_by = ?, pinned_at = ?, reactions = ?, updated_at_ms = ? WHERE id = ? AND conversation_id = ?",
    [
      JSON.stringify(starredBy),
      JSON.stringify(hiddenBy),
      pinnedAt,
      JSON.stringify(reactionsMap),
      Date.now(),
      messageId,
      conversationId,
    ],
  );
  emitMessageUpdate(
    peerId,
    {
      ...row,
      starred_by: JSON.stringify(starredBy),
      hidden_by: JSON.stringify(hiddenBy),
      pinned_at: pinnedAt,
      reactions: JSON.stringify(reactionsMap),
    },
    userId,
  );
  return { ok: true };
}

async function getRetentionMode(conversationId, userId) {
  const rows = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );
  if (!rows.length) return "keep";
  const settings = parseJsonColumn(rows[0].settings, {});
  return settings.retentionMode || "keep";
}

async function listMessages(peerId, userId, sinceMs) {
  const conversationId = storageKey(userId, peerId);
  const participants = await assertParticipant(peerId, userId);
  const expired = await query(
    `SELECT id FROM chat_messages WHERE conversation_id = ? AND expires_at IS NOT NULL
     AND expires_at <= NOW(6) AND deleted_for_everyone = 0`,
    [conversationId],
  );
  await softDeleteMessages(
    conversationId,
    expired.map((row) => row.id),
  );
  const rows = sinceMs
    ? await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ? AND updated_at_ms > ?
         ORDER BY created_at_ms ASC`,
        [conversationId, sinceMs],
      )
    : await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ?
         ORDER BY created_at_ms ASC`,
        [conversationId],
      );
  const toMarkRead = rows.filter(
    (row) =>
      row.sender_id !== userId &&
      row.status !== "read" &&
      !row.deleted_for_everyone,
  );
  if (toMarkRead.length) {
    const readIds = toMarkRead.map((row) => row.id);
    await query(
      `UPDATE chat_messages SET status = 'read', updated_at_ms = ?
       WHERE conversation_id = ? AND id IN (${readIds.map(() => "?").join(",")})`,
      [Date.now(), conversationId, ...readIds],
    );
    toMarkRead.forEach((row) => {
      row.status = "read";
    });
    const senderIds = [...new Set(toMarkRead.map((row) => row.sender_id))];
    senderIds.forEach((sid) =>
      realtime.emitToUser(sid, "message:status", {
        conversationId: addressFor(participants, sid),
        ids: toMarkRead
          .filter((row) => row.sender_id === sid)
          .map((row) => row.id),
        status: "read",
      }),
    );
  }
  const messages = rows.map((row) => rowToMessage(row, userId));
  const seenNow = rows.filter(
    (row) =>
      row.delete_after_seen &&
      row.sender_id !== userId &&
      !row.deleted_for_everyone,
  );
  await softDeleteMessages(
    conversationId,
    seenNow.map((row) => row.id),
  );
  return messages;
}

async function markConversationRead(peerId, userId) {
  const conversationId = storageKey(userId, peerId);
  const participants = await assertParticipant(peerId, userId);
  const rows = await query(
    `SELECT id FROM chat_messages
     WHERE conversation_id = ? AND sender_id <> ? AND status <> 'read' AND deleted_for_everyone = 0`,
    [conversationId, userId],
  );
  const ids = rows.map((row) => row.id);
  if (ids.length) {
    await query(
      `UPDATE chat_messages SET status = 'read', updated_at_ms = ?
       WHERE conversation_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
      [Date.now(), conversationId, ...ids],
    );
    const partnerId = participants.find((pid) => pid !== userId);
    realtime.emitToUser(partnerId, "message:status", {
      conversationId: addressFor(participants, partnerId),
      ids,
      status: "read",
    });
  }
  return { ids };
}

async function sendMessage(peerId, userId, message) {
  const conversationId = storageKey(userId, peerId);
  const participants = await assertParticipant(peerId, userId);
  const id = String(message.id || crypto.randomUUID());
  const createdAtMs = Number(message.createdAt) || Date.now();
  const {
    id: _id,
    senderId: _senderId,
    mine: _mine,
    status: _status,
    createdAt: _createdAt,
    starredByMe: _starredByMe,
    pinnedAt: _pinnedAt,
    reactions: _reactions,
    editedAt: _editedAt,
    deletedAt: _deletedAt,
    deletedForEveryone: _deletedForEveryone,
    ...payload
  } = message;
  // A reply to someone's story: only the label is kept, never the story itself.
  if (payload.storyReply) payload.storyReply = { reaction: !!payload.storyReply.reaction };
  const retentionMode = await getRetentionMode(conversationId, userId);
  let expiresAt = null;
  let deleteAfterSeen = 0;
  if (retentionMode === "24_hours") {
    expiresAt = new Date(createdAtMs + 24 * 60 * 60 * 1000);
  } else if (retentionMode === "7_days") {
    expiresAt = new Date(createdAtMs + 7 * 24 * 60 * 60 * 1000);
  } else if (retentionMode === "after_seen") {
    deleteAfterSeen = 1;
  }
  await query(
    `INSERT INTO chat_messages (id, conversation_id, sender_id, message_type, payload, status, created_at_ms, updated_at_ms, expires_at, delete_after_seen)
     VALUES (?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [
      id,
      conversationId,
      userId,
      message.type || "text",
      JSON.stringify(payload),
      createdAtMs,
      createdAtMs,
      expiresAt,
      deleteAfterSeen,
    ],
  );
  const [row] = await query(
    `SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?`,
    [id, conversationId],
  );
  const stored = rowToMessage(row, userId);
  const recipientId = participants.find((pid) => pid !== userId);
  if (recipientId) {
    realtime.emitToUser(recipientId, "message:new", {
      conversationId: addressFor(participants, recipientId),
      message: rowToMessage(row, recipientId),
    });
    notifyRecipient(conversationId, userId, recipientId, stored).catch(
      () => undefined,
    );
  }
  return stored;
}

async function notifyRecipient(conversationId, senderId, recipientId, message) {
  await query(
    `UPDATE chat_messages SET status = 'delivered', updated_at_ms = ?
     WHERE id = ? AND conversation_id = ? AND status = 'sent'`,
    [Date.now(), message.id, conversationId],
  );
  realtime.emitToUser(senderId, "message:status", {
    conversationId,
    ids: [message.id],
    status: "delivered",
  });
  const settingsRows = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [conversationId, recipientId],
  );
  let silent = false;
  if (settingsRows.length) {
    const settings = parseJsonColumn(settingsRows[0].settings, {});
    // Muted: forever, or until the time chosen (1 hour, 8 hours, a week).
    // Once that time has passed, notifications come back on their own.
    if (settings.notificationMode === "muted") {
      const until = Number(settings.mutedUntil) || 0;
      if (!until || until > Date.now()) return;
    } else if (settings.mutedUntil && Number(settings.mutedUntil) > Date.now()) return;
    silent = settings.notificationSound === "Silent";
  }
  const [profile] = await query(
    "SELECT first_name FROM profiles WHERE user_id = ?",
    [senderId],
  );
  const senderName = profile?.first_name || "Someone";
  const text = message.text ? String(message.text) : "";
  const preview = !text
    ? "Sent you a message"
    : message.storyReply
      ? (message.storyReply.reaction ? `Reacted ${text} to your story` : `Replied to your story: ${text}`).slice(0, 120)
      : text.slice(0, 120);
  await pushService.notifyUser(recipientId, {
    title: senderName,
    body: preview,
    conversationId: addressFor([senderId, recipientId], recipientId),
    ...(silent ? { silent: true } : {}),
  });
}

async function createDateProposal(peerId, userId, date) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO date_proposals (id, conversation_id, proposer_id, status, venue, category, area, time_label)
     VALUES (?, ?, ?, 'proposed', ?, ?, ?, ?)`,
    [
      id,
      conversationId,
      userId,
      date?.venue || null,
      date?.category || null,
      date?.area || null,
      date?.time || null,
    ],
  );
  return { id, status: "proposed" };
}

async function updateDatePlanStatus(userId, proposalId, status) {
  if (!proposalId) {
    const err = new Error("proposalId is required");
    err.status = 400;
    throw err;
  }
  const rows = await query("SELECT * FROM date_proposals WHERE id = ?", [
    proposalId,
  ]);
  if (!rows.length) {
    const err = new Error("Date proposal not found");
    err.status = 404;
    throw err;
  }
  // rows[0].conversation_id is "dm:<idA>:<idB>", not a peer id — resolve it.
  await assertParticipantByConversationId(rows[0].conversation_id, userId);
  const proposal = rows[0];
  const mine = proposal.proposer_id === userId;
  // The other person accepts or declines; whoever proposed it can cancel.
  if ((status === "accepted" || status === "declined") && mine) {
    const err = new Error("Only the person you invited can answer this plan.");
    err.status = 403;
    throw err;
  }
  if (status === "cancelled" && !mine) {
    const err = new Error("Only the person who proposed it can cancel this plan.");
    err.status = 403;
    throw err;
  }
  if (!["proposed", "countered"].includes(proposal.status) && status !== "cancelled") {
    const err = new Error("This plan has already been answered.");
    err.status = 409;
    throw err;
  }
  await query("UPDATE date_proposals SET status = ? WHERE id = ?", [
    status,
    proposalId,
  ]);
  await syncDateCard(proposal.conversation_id, proposalId, userId, (date) => ({ ...date, planStatus: status }));
  return { id: proposalId, status };
}

/** Changes the date card in the chat to match the plan, and shows it to both. */
async function syncDateCard(conversationId, proposalId, actingUserId, change) {
  const rows = await query(
    `SELECT * FROM chat_messages WHERE conversation_id = ? AND message_type = 'date' AND payload LIKE ?`,
    [conversationId, `%${proposalId}%`],
  );
  for (const row of rows) {
    const payload = parseJsonColumn(row.payload, {});
    if (!payload.date || payload.date.proposalId !== proposalId) continue;
    payload.date = change(payload.date);
    await query("UPDATE chat_messages SET payload = ?, updated_at_ms = ? WHERE id = ? AND conversation_id = ?", [
      JSON.stringify(payload),
      Date.now(),
      row.id,
      conversationId,
    ]);
    const [, a, b] = String(conversationId).split(":");
    const peerId = a === actingUserId ? b : a;
    await emitMessageUpdate(peerId, { ...row, payload: JSON.stringify(payload) }, actingUserId);
  }
}

/**
 * "I'm safe" after an accepted date: marks the plan done and counts as a
 * safe check-in for you in Safety Center.
 */
async function dateCheckIn(userId, proposalId) {
  const [proposal] = await query("SELECT * FROM date_proposals WHERE id = ?", [String(proposalId || "")]);
  if (!proposal) {
    const err = new Error("Date proposal not found");
    err.status = 404;
    throw err;
  }
  await assertParticipantByConversationId(proposal.conversation_id, userId);
  if (!["accepted", "completed"].includes(proposal.status)) {
    const err = new Error("You can check in once the date is accepted.");
    err.status = 409;
    throw err;
  }
  await query("UPDATE date_proposals SET status = 'completed' WHERE id = ?", [proposal.id]);
  await syncDateCard(proposal.conversation_id, proposal.id, userId, (date) => {
    const safeBy = Array.isArray(date.safeBy) ? date.safeBy : [];
    return { ...date, planStatus: "completed", safeBy: safeBy.includes(userId) ? safeBy : [...safeBy, userId] };
  });
  return { id: proposal.id, status: "completed", safe: true };
}

/** Your safe check-ins, for the number in Safety Center. */
async function safeCheckInCount(userId) {
  const [row] = await query(
    `SELECT COUNT(*) AS n FROM chat_messages
      WHERE message_type = 'date' AND payload LIKE '%safeBy%'
        AND JSON_CONTAINS(JSON_EXTRACT(payload, '$.date.safeBy'), JSON_QUOTE(?))`,
    [userId],
  );
  return Number(row?.n || 0);
}

/** A vote on a poll in the chat: one each, can be changed, results for both. */
async function votePoll(peerId, userId, messageId, choice) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  const [row] = await query("SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?", [String(messageId), conversationId]);
  if (!row) {
    const err = new Error("That poll is no longer here.");
    err.status = 404;
    throw err;
  }
  const payload = parseJsonColumn(row.payload, {});
  const options = payload.poll && Array.isArray(payload.poll.options) ? payload.poll.options : null;
  const index = Number(choice);
  if (!options || !Number.isInteger(index) || index < 0 || index >= options.length) {
    const err = new Error("Choose one of the poll's options.");
    err.status = 400;
    throw err;
  }
  payload.poll.votes = { ...(payload.poll.votes || {}), [userId]: index };
  await query("UPDATE chat_messages SET payload = ?, updated_at_ms = ? WHERE id = ? AND conversation_id = ?", [
    JSON.stringify(payload),
    Date.now(),
    row.id,
    conversationId,
  ]);
  const updated = { ...row, payload: JSON.stringify(payload) };
  await emitMessageUpdate(peerId, updated, userId);
  return rowToMessage(updated, userId);
}

async function shareLiveLocation(peerId, userId, location, clientActionId) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO live_locations (id, conversation_id, sharer_id, client_action_id, latitude, longitude, label, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`,
    [
      id,
      conversationId,
      userId,
      clientActionId,
      location?.latitude ?? null,
      location?.longitude ?? null,
      location?.label || null,
      location?.expiresAt ? new Date(location.expiresAt) : null,
    ],
  );
  return { ok: true };
}

const ONLINE_WINDOW_MS = 45 * 1000;
const TYPING_WINDOW_MS = 6 * 1000;
const typingByKey = new Map();

function typingKey(conversationId, userId) {
  return `${conversationId}:${userId}`;
}

async function setTyping(peerId, userId, typing) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  const key = typingKey(conversationId, userId);
  if (!typing) {
    typingByKey.delete(key);
    return { ok: true };
  }
  const settings = await getSettings(peerId, userId);
  if (settings && settings.shareTypingStatus === false) {
    typingByKey.delete(key);
    return { ok: true };
  }
  typingByKey.set(key, Date.now());
  return { ok: true };
}

function isTypingFresh(conversationId, userId) {
  const at = typingByKey.get(typingKey(conversationId, userId));
  return !!at && Date.now() - at < TYPING_WINDOW_MS;
}

async function getPartnerPresence(peerId, userId) {
  const conversationId = storageKey(userId, peerId);
  const participants = await assertParticipant(peerId, userId);
  const partnerId = participants.find((id) => id !== userId);
  if (!partnerId) return { online: false, lastActiveAt: null, typing: false };
  const [row] = await query("SELECT last_active_at, hide_activity FROM users WHERE id = ?", [
    partnerId,
  ]);
  // "Hide activity status": either of you hid it, neither sees the other's.
  const [me] = await query("SELECT hide_activity FROM users WHERE id = ?", [userId]);
  if (Number(row?.hide_activity) === 1 || Number(me?.hide_activity) === 1) {
    return { online: false, lastActiveAt: null, typing: isTypingFresh(conversationId, partnerId), hidden: true };
  }
  const lastActiveAt = row?.last_active_at
    ? new Date(row.last_active_at).toISOString()
    : null;
  const online =
    !!lastActiveAt &&
    Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;
  const typing = isTypingFresh(conversationId, partnerId);
  return { online, lastActiveAt, typing };
}

async function getSettings(peerId, userId) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  const rows = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );
  if (!rows.length) return null;
  return parseJsonColumn(rows[0].settings, null);
}

async function saveSettings(peerId, userId, settings) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  await query(
    `INSERT INTO chat_conversation_settings (conversation_id, user_id, settings)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE settings = VALUES(settings)`,
    [conversationId, userId, JSON.stringify(settings)],
  );
  return { ok: true };
}

/** Screenshot notices already sent: one per chat every 30 seconds. */
const screenshotSent = new Map();

/**
 * You took a screenshot of this chat (the phone app can tell). The other
 * person sees "📸 Took a screenshot of this chat" from you - unless they
 * turned Screenshot alerts off in their settings for this chat.
 */
async function screenshotNotice(peerId, userId) {
  const conversationId = storageKey(userId, peerId);
  await assertParticipant(peerId, userId);
  const last = screenshotSent.get(`${conversationId}:${userId}`) || 0;
  if (Date.now() - last < 30 * 1000) return { sent: false, reason: "recent" };
  const [row] = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [conversationId, peerId],
  );
  const theirs = row ? parseJsonColumn(row.settings, {}) : {};
  if (theirs.screenshotAlerts === false) return { sent: false, reason: "off" };
  if (screenshotSent.size > 20000) screenshotSent.clear();
  screenshotSent.set(`${conversationId}:${userId}`, Date.now());
  await sendMessage(peerId, userId, {
    id: crypto.randomUUID(),
    type: "text",
    text: "📸 Took a screenshot of this chat",
    screenshotNotice: true,
    createdAt: Date.now(),
  });
  return { sent: true };
}

/**
 * How a chat sits in your list: pinned to the top, archived (until a new
 * message arrives after you archived it), muted.
 */
function listFlags(settings, lastAt) {
  const s = settings || {};
  const archivedAt = Number(s.archivedAt) || 0;
  const muted =
    s.notificationMode === "muted"
      ? !Number(s.mutedUntil) || Number(s.mutedUntil) > Date.now()
      : false;
  return {
    pinned: !!s.conversationPinned,
    archived: !!s.conversationArchived && (!archivedAt || lastAt <= archivedAt),
    muted,
  };
}

async function listConversations(userId, limit = 100) {
  const rows = await query(
    `SELECT m.conversation_id,
            MAX(m.created_at_ms) AS last_at,
            SUM(CASE WHEN m.sender_id <> ? AND m.status <> 'read' THEN 1 ELSE 0 END) AS unread
       FROM chat_messages m
      WHERE m.deleted_for_everyone = 0
        AND (m.conversation_id LIKE CONCAT('dm:', ?, ':%')
          OR m.conversation_id LIKE CONCAT('dm:%:', ?))
      GROUP BY m.conversation_id
      ORDER BY last_at DESC
      LIMIT ${Number(limit)}`,
    [userId, userId, userId],
  );
  if (!rows.length) return [];

  // 🔥 for every chat in one go. Lazy-required: streakService needs the
  // db module only, but keeping it out of the top keeps load order simple.
  const streaks = await require("./streakService").forMember(userId);

  // Your own settings for each chat: pinned, archived, muted.
  const settingRows = await query(
    "SELECT conversation_id, settings FROM chat_conversation_settings WHERE user_id = ?",
    [userId],
  );
  const settingsFor = new Map(settingRows.map((s) => [s.conversation_id, parseJsonColumn(s.settings, {})]));

  const out = [];
  for (const row of rows) {
    const [, a, b] = String(row.conversation_id).split(":");
    const otherId = a === userId ? b : a;
    if (!otherId) continue;

    const [last] = await query(
      `SELECT * FROM chat_messages
        WHERE conversation_id = ? AND deleted_for_everyone = 0
        ORDER BY created_at_ms DESC LIMIT 1`,
      [row.conversation_id],
    );
    const [person] = await query(
      // The first profile photo, so the chat list and header show a face
      // (most members never set users.avatar_url).
      `SELECT u.id, u.username, u.full_name,
              COALESCE((SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = u.id ORDER BY ph.position ASC LIMIT 1), u.avatar_url) AS avatar_url,
              u.is_private
         FROM users u WHERE u.id = ? AND u.deleted_at IS NULL`,
      [otherId],
    );
    if (!person) continue;

    out.push({
      conversationId: otherId,
      user: {
        userId: person.id,
        username: person.username,
        name: person.full_name || person.username,
        avatarUrl: person.avatar_url,
        isPrivate: !!person.is_private,
      },
      lastMessage: last ? rowToMessage(last, userId) : null,
      lastAt: Number(row.last_at) || 0,
      unread: Number(row.unread) || 0,
      streak: streaks.get(row.conversation_id) ?? { count: 0, atRisk: false, show: false },
      ...listFlags(settingsFor.get(row.conversation_id), Number(row.last_at) || 0),
    });
  }
  return out;
}

module.exports = {
  storageKey,
  listConversations,
  listFlags,
  screenshotNotice,
  assertParticipant,
  assertParticipantByConversationId,
  dateCheckIn,
  safeCheckInCount,
  votePoll,
  listMessages,
  sendMessage,
  createDateProposal,
  updateDatePlanStatus,
  shareLiveLocation,
  getPartnerPresence,
  setTyping,
  isTypingFresh,
  markConversationRead,
  editMessage,
  deleteMessage,
  setMessageState,
  getSettings,
  saveSettings,
};
