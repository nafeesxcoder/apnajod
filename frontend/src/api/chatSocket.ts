import { API_URL } from "./config";
import { io, type Socket } from "socket.io-client";

// One shared realtime connection for the whole app. It carries new
// messages, delivered/read ticks, edits, typing and online/offline presence.
// REST stays as the fallback: if the socket is down the app keeps polling,
// so a failed websocket never breaks chat.

/**
 * Where the socket actually connects, given the API may sit behind a path
 * prefix such as http://host/api when a reverse proxy serves it on port 80.
 *
 * socket.io reads a path in the URL as a *namespace*, not a prefix, so
 * io("http://host/api") asks for a namespace the server does not have and
 * the connection is refused. The prefix belongs in the `path` option.
 */
export function socketTarget(apiUrl: string) {
  try {
    const url = new URL(apiUrl);
    const prefix = url.pathname.replace(/\/+$/, "");
    return { origin: url.origin, path: `${prefix}/socket.io` };
  } catch {
    return { origin: apiUrl, path: "/socket.io" };
  }
}

let socket: Socket | null = null;
// Read on every (re)connect so a token refreshed in the background is used
// without tearing the connection down.
let latestToken = "";

export function connectChatSocket(accessToken: string): Socket | null {
  if (!accessToken) return null;
  latestToken = accessToken;
  if (socket) return socket;
  const target = socketTarget(API_URL);
  socket = io(target.origin, {
    path: target.path,
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
