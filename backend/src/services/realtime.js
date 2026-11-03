// Socket.io realtime layer for chat: instant new messages, delivered/read
// ticks, edits/deletes/reactions, typing and online/offline presence.
// REST endpoints stay in place as the fallback; if the socket is down the
// app keeps polling, so nothing here is required for correctness.
const { Server } = require("socket.io");
const { isAllowedOrigin } = require("../config/security");
const { verifyAccessToken } = require("../utils/jwt");
const { query } = require("../config/db");

let io = null;
// userId -> number of live sockets (a user may have several tabs/devices)
const socketCounts = new Map();

const userRoom = (userId) => `user:${userId}`;
const presenceRoom = (userId) => `presence:${userId}`;

function chat() {
  // Lazy require: chatService also requires this module.
  return require("./chatService");
}

function isOnline(userId) {
  return (socketCounts.get(userId) || 0) > 0;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

function touchLastActive(userId) {
  return query("UPDATE users SET last_active_at = NOW(6) WHERE id = ?", [
    userId,
  ]).catch(() => undefined);
}

function broadcastPresence(userId, online) {
  if (!io) return;
  io.to(presenceRoom(userId)).emit("presence", {
    userId,
    online,
    lastActiveAt: new Date().toISOString(),
  });
}

function partnerOf(participants, userId) {
  return participants.find((id) => id !== userId);
}

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: false,
    },
    // Mobile browsers drop sockets often; detect a dead one quickly.
    pingInterval: 15000,
    pingTimeout: 10000,
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error("unauthorized"));
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(userRoom(userId));
    const count = (socketCounts.get(userId) || 0) + 1;
    socketCounts.set(userId, count);
    if (count === 1) {
      touchLastActive(userId);
      broadcastPresence(userId, true);
    }

    // Start watching a conversation: join the partner's presence room and
    // get the current presence back straight away.
    socket.on("conversation:watch", async (conversationId, ack) => {
      try {
        const participants = await chat().assertParticipant(
          String(conversationId),
          userId,
        );
        const partnerId = partnerOf(participants, userId);
        if (!partnerId) return ack && ack({ ok: false });
        socket.join(presenceRoom(partnerId));
        const presence = await chat().getPartnerPresence(
          String(conversationId),
          userId,
        );
        ack &&
          ack({
            ok: true,
            partnerId,
            online: isOnline(partnerId) || presence.online,
            lastActiveAt: presence.lastActiveAt,
            typing: presence.typing,
          });
      } catch {
        ack && ack({ ok: false });
      }
    });

    socket.on("conversation:unwatch", async (conversationId) => {
      try {
        const participants = await chat().assertParticipant(
          String(conversationId),
          userId,
        );
        const partnerId = partnerOf(participants, userId);
        if (partnerId) socket.leave(presenceRoom(partnerId));
      } catch {
        /* ignore */
      }
    });

    socket.on("typing", async (data) => {
      try {
        const conversationId = String(data && data.conversationId);
        const typing = !!(data && data.typing);
        const participants = await chat().assertParticipant(
          conversationId,
          userId,
        );
        await chat().setTyping(conversationId, userId, typing);
        // setTyping drops the flag when the user hides their typing status.
        if (typing && !chat().isTypingFresh(conversationId, userId)) return;
        const partnerId = partnerOf(participants, userId);
        // The partner addresses this chat by the sender's user id.
        emitToUser(partnerId, "typing", {
          conversationId: userId,
          userId,
          typing,
        });
      } catch {
        /* ignore */
      }
    });

    // The recipient has the chat open and visible: mark everything read and
    // tell the sender so the ticks turn blue instantly.
    socket.on("messages:read", async (conversationId, ack) => {
      try {
        const result = await chat().markConversationRead(
          String(conversationId),
          userId,
        );
        ack && ack({ ok: true, ids: result.ids });
      } catch {
        ack && ack({ ok: false });
      }
    });

    socket.on("disconnect", () => {
      const left = (socketCounts.get(userId) || 1) - 1;
      if (left <= 0) {
        socketCounts.delete(userId);
        touchLastActive(userId);
        broadcastPresence(userId, false);
      } else {
        socketCounts.set(userId, left);
      }
    });
  });

  return io;
}

module.exports = { init, emitToUser, isOnline };
