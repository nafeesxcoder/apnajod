import { io, type Socket } from "socket.io-client";

// One shared realtime connection for the whole app. It carries new
// messages, delivered/read ticks, edits, typing and online/offline presence.
// REST stays as the fallback: if the socket is down the app keeps polling,
// so a failed websocket never breaks chat.
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;
// Read on every (re)connect so a token refreshed in the background is used
// without tearing the connection down.
let latestToken = "";

export function connectChatSocket(accessToken: string): Socket | null {
  if (!accessToken) return null;
  latestToken = accessToken;
  if (socket) return socket;
  socket = io(API_URL, {
    auth: (cb) => cb({ token: latestToken }),
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
  });
  return socket;
}

export function disconnectChatSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  latestToken = "";
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function isChatSocketConnected() {
  return !!socket?.connected;
}

// Returns true when the signal went out over the socket; the caller falls
// back to the REST endpoint otherwise.
export function emitChatTyping(conversationId: string, typing: boolean) {
  if (!socket?.connected) return false;
  socket.emit("typing", { conversationId, typing });
  return true;
}

export function emitChatRead(conversationId: string) {
  if (!socket?.connected) return false;
  socket.emit("messages:read", conversationId);
  return true;
}
