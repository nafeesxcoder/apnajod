import { useSyncExternalStore } from "react";
import type { Match } from "../../data";

// The call lives here, outside any one screen. It used to be React state
// inside ChatScreen, so leaving the chat (even after minimising the call)
// unmounted the call UI and its WebRTC connection and the call was cut.
// CallHost (mounted once at the app root) renders the call from this store.
export type CallSession = {
  mode: "audio" | "video" | null;
  callId: string | null;
  isCaller: boolean;
  minimized: boolean;
  match: Match | null;
  isCoupleMode: boolean;
};

const IDLE: CallSession = {
  mode: null,
  callId: null,
  isCaller: true,
  minimized: false,
  match: null,
  isCoupleMode: false,
};

let state: CallSession = IDLE;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const callSession = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  begin(next: {
    mode: "audio" | "video";
    callId: string | null;
    isCaller: boolean;
    match: Match;
    isCoupleMode: boolean;
  }) {
    state = { ...next, minimized: false };
    emit();
  },
  setMinimized(minimized: boolean) {
    if (!state.mode || state.minimized === minimized) return;
    state = { ...state, minimized };
    emit();
  },
  // Ends the call UI. When `matchId` is given, only a call with that match is ended.
  end(matchId?: string) {
    if (!state.mode) return;
    if (matchId && state.match?.id !== matchId) return;
    state = IDLE;
    emit();
  },
  reset() {
    state = IDLE;
    emit();
  },
};

export function useCallSession(): CallSession {
  return useSyncExternalStore(callSession.subscribe, callSession.get, callSession.get);
}
