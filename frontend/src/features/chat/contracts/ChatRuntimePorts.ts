import type { ChatGifCatalogItem } from '../../../domain/chatMediaCatalog';

export type RealtimeCallSignal =
  | { type: 'offer' | 'answer'; sdp: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

export type RealtimeCallEvent = {
  event: 'invite' | 'accept' | 'reject' | 'end' | 'missed' | 'failed' | 'signal';
  clientCallId: string;
  mode?: 'audio' | 'video';
  signal?: RealtimeCallSignal;
  userId?: string;
  at?: string;
};

export type MatchRealtimeHandlers = {
  onTyping?: (typing: boolean) => void;
  onPresence?: (online: boolean) => void;
  onReceipt?: (status: 'delivered' | 'read', at: string) => void;
  onCall?: (event: RealtimeCallEvent) => void;
  onConnection?: (connected: boolean) => void;
};

export type MatchRealtimeSession = {
  sendTyping: (typing: boolean) => Promise<void>;
  markDelivered: () => Promise<void>;
  markRead: () => Promise<void>;
  sendCall: (event: RealtimeCallEvent) => Promise<void>;
  close: () => Promise<void>;
};

export type GifSearchPage = {
  items: ChatGifCatalogItem[];
  totalCount: number;
  nextOffset: number | null;
  provider: string;
};

export type ChatRuntimePorts = {
  realtime: {
    connect: (matchId: string, handlers: MatchRealtimeHandlers) => Promise<MatchRealtimeSession | null>;
  };
  gifSearch: {
    configured: boolean;
    providerName: string;
    search: (input: { query: string; offset?: number; limit?: number }) => Promise<GifSearchPage>;
  };
};
