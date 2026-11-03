const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

async function authFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type IceServersResult = {
  iceServers: RTCIceServer[];
};

export type StartCallResult = {
  id: string;
  conversationId: string;
  calleeId: string;
  mode: "audio" | "video";
  status: string;
};

export type CallSignal = {
  id: string;
  type: string;
  payload: any;
  createdAtMs: number;
};

export type IncomingCall = {
  id: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  mode: "audio" | "video";
} | null;

export const callApi = {
  async getIceServers(accessToken: string): Promise<IceServersResult> {
    const data = await authFetch("/calls/ice-servers", accessToken);
    return { iceServers: data.iceServers || [] };
  },

  async start(
    accessToken: string,
    conversationId: string,
    mode: "audio" | "video",
  ): Promise<StartCallResult> {
    const data = await authFetch("/calls/start", accessToken, {
      method: "POST",
      body: JSON.stringify({ conversationId, mode }),
    });
    return data;
  },

  async respond(accessToken: string, callId: string, accept: boolean) {
    return authFetch(`/calls/${callId}/respond`, accessToken, {
      method: "POST",
      body: JSON.stringify({ accept }),
    });
  },

  async end(accessToken: string, callId: string, reason?: string) {
    return authFetch(`/calls/${callId}/end`, accessToken, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async getStatus(accessToken: string, callId: string): Promise<{ status: string }> {
    return authFetch(`/calls/${callId}/status`, accessToken);
  },

  async sendSignal(accessToken: string, callId: string, type: string, payload: unknown) {
    return authFetch(`/calls/${callId}/signal`, accessToken, {
      method: "POST",
      body: JSON.stringify({ type, payload }),
    });
  },

  async pollSignals(
    accessToken: string,
    callId: string,
    sinceMs: number,
  ): Promise<CallSignal[]> {
    const data = await authFetch(
      `/calls/${callId}/signals?sinceMs=${sinceMs}`,
      accessToken,
    );
    return data.signals || [];
  },

  async getIncoming(accessToken: string): Promise<IncomingCall> {
    const data = await authFetch("/calls/incoming", accessToken);
    return data.call || null;
  },
};
