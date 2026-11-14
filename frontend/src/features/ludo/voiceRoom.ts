/**
 * Live voice for a Ludo game: everyone who turns their mic on can hear
 * everyone else, up to four people.
 *
 * Each pair of phones talks directly (WebRTC). The server only passes the
 * set-up messages between players of the same game and says who has
 * their mic on; when two phones cannot reach each other directly, the
 * audio goes through our own TURN server (coturn).
 *
 * To avoid both sides calling at once, the one whose user id sorts first
 * starts each connection.
 */
import { webrtcReady } from "../chat/webrtcGlobals";
import { callApi } from "../../api/callApi";
import { getChatSocket } from "../../api/chatSocket";
import { setCallSpeaker, startCallAudio, stopCallAudio } from "../chat/callAudioRoute";

export type VoiceUser = { userId: string; muted: boolean };
type Signal =
  | { type: "offer" | "answer"; sdp: { type: string; sdp: string } }
  | { type: "ice"; candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null } };

const FALLBACK_ICE = [{ urls: ["stun:stun.l.google.com:19302"] }];

export class VoiceRoom {
  private peers = new Map<string, RTCPeerConnection>();
  private pending = new Map<string, Signal[]>();
  private sinks = new Map<string, HTMLAudioElement>();
  private stream: MediaStream | null = null;
  private iceServers: RTCIceServer[] = FALLBACK_ICE;
  private stopped = false;
  users: VoiceUser[] = [];
  muted = false;
  speaker = true;

  constructor(
    private gameId: string,
    private myId: string,
    private accessToken: string,
    private onChange: () => void,
  ) {}

  /** Can this device do live voice at all? */
  static available() {
    return !!webrtcReady && typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof RTCPeerConnection !== "undefined";
  }

  async start() {
    if (!VoiceRoom.available()) throw new Error("Live voice is not available on this device.");
    const socket = getChatSocket();
    if (!socket) throw new Error("Not connected. Check your internet and try again.");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    try {
      const result = await callApi.getIceServers(this.accessToken);
      if (result?.iceServers?.length) this.iceServers = result.iceServers as RTCIceServer[];
    } catch {
      // Plain STUN still works for most people.
    }
    startCallAudio(false);
    setCallSpeaker(this.speaker);
    socket.on("ludo:signal", this.onSignal);
    socket.on("ludo:voice", this.onVoice);
    socket.emit("ludo:voice", { gameId: this.gameId, on: true, muted: false }, (ack: { ok: boolean; users?: VoiceUser[] }) => {
      if (ack?.users) this.sync(ack.users);
    });
  }

  /** Who has their mic on, without turning mine on (to show it in the room). */
  static peek(gameId: string, done: (users: VoiceUser[]) => void) {
    getChatSocket()?.emit("ludo:voice", { gameId }, (ack: { ok: boolean; users?: VoiceUser[] }) => done(ack?.users ?? []));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    getChatSocket()?.emit("ludo:voice", { gameId: this.gameId, on: true, muted });
    this.onChange();
  }

  setSpeaker(on: boolean) {
    this.speaker = on;
    setCallSpeaker(on);
    this.onChange();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    const socket = getChatSocket();
    socket?.emit("ludo:voice", { gameId: this.gameId, on: false });
    socket?.off("ludo:signal", this.onSignal);
    socket?.off("ludo:voice", this.onVoice);
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    stopCallAudio();
  }

  private send(to: string, data: Signal) {
    getChatSocket()?.emit("ludo:signal", { gameId: this.gameId, to, data });
  }

  private sync(users: VoiceUser[]) {
    if (this.stopped) return;
    this.users = users;
    const others = users.map((u) => u.userId).filter((id) => id !== this.myId);
    for (const id of [...this.peers.keys()]) if (!others.includes(id)) this.closePeer(id);
    for (const id of others) if (!this.peers.has(id) && this.myId < id) void this.call(id);
    this.onChange();
  }

  private onVoice = (data: { gameId: string; users: VoiceUser[] }) => {
    if (data?.gameId === this.gameId) this.sync(data.users ?? []);
  };

  private makePeer(id: string) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.stream?.getTracks().forEach((track) => pc.addTrack(track, this.stream!));
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send(id, {
          type: "ice",
          candidate: { candidate: event.candidate.candidate, sdpMid: event.candidate.sdpMid, sdpMLineIndex: event.candidate.sdpMLineIndex },
        });
      }
    };
    pc.ontrack = (event) => {
      const remote = event.streams[0];
      if (!remote || typeof document === "undefined") return; // the phone app plays it by itself
      let sink = this.sinks.get(id);
      if (!sink) {
        sink = document.createElement("audio");
        sink.autoplay = true;
        sink.setAttribute("playsinline", "");
        document.body.appendChild(sink);
        this.sinks.set(id, sink);
      }
      sink.srcObject = remote;
      void sink.play().catch(() => undefined);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" && !this.stopped) {
        this.closePeer(id);
        if (this.myId < id) setTimeout(() => void this.call(id), 1500);
      }
    };
    this.peers.set(id, pc);
    return pc;
  }

  private closePeer(id: string) {
    this.peers.get(id)?.close();
    this.peers.delete(id);
    this.pending.delete(id);
    const sink = this.sinks.get(id);
    if (sink) {
      sink.srcObject = null;
      sink.remove();
      this.sinks.delete(id);
    }
  }

  private async call(id: string) {
    if (this.stopped || this.peers.has(id)) return;
    const pc = this.makePeer(id);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const local = pc.localDescription!;
    this.send(id, { type: "offer", sdp: { type: local.type, sdp: local.sdp } });
  }

  private onSignal = async (msg: { gameId: string; from: string; data: Signal }) => {
    if (this.stopped || msg?.gameId !== this.gameId || !msg.data) return;
    const { from, data } = msg;
    try {
      if (data.type === "offer") {
        const pc = this.peers.get(from) ?? this.makePeer(from);
        await pc.setRemoteDescription(data.sdp as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const local = pc.localDescription!;
        this.send(from, { type: "answer", sdp: { type: local.type, sdp: local.sdp } });
        await this.flush(from);
      } else if (data.type === "answer") {
        const pc = this.peers.get(from);
        if (pc) {
          await pc.setRemoteDescription(data.sdp as RTCSessionDescriptionInit);
          await this.flush(from);
        }
      } else if (data.type === "ice") {
        const pc = this.peers.get(from);
        if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        else this.pending.set(from, [...(this.pending.get(from) ?? []), data]);
      }
    } catch {
      // A broken hand-shake: the connection-state watcher starts over.
    }
  };

  private async flush(id: string) {
    const pc = this.peers.get(id);
    const queued = this.pending.get(id) ?? [];
    this.pending.delete(id);
    for (const signal of queued) {
      if (signal.type === "ice" && pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => undefined);
    }
  }
}
