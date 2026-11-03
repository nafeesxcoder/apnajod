import type { GifSearchPage } from "../features/chat/contracts/ChatRuntimePorts";
import type { ChatGifCatalogItem } from "../domain/chatMediaCatalog";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

async function authGet(path: string, accessToken: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "GIF search failed.",
    );
  }
  return data;
}

// True when the server has a GIPHY key; otherwise the app keeps using its
// built-in reaction catalog.
export async function isLiveGifSearchAvailable(accessToken: string) {
  try {
    const data = await authGet("/chat/gifs/status", accessToken);
    return data?.configured === true;
  } catch {
    return false;
  }
}

export function createBackendGifSearch(accessToken: string) {
  return {
    configured: true,
    providerName: "GIPHY",
    search: async ({
      query,
      offset = 0,
      limit = 36,
    }: {
      query: string;
      offset?: number;
      limit?: number;
    }): Promise<GifSearchPage> => {
      const params = new URLSearchParams({
        q: query.trim(),
        offset: String(offset),
        limit: String(limit),
      });
      const data = await authGet(`/chat/gifs?${params}`, accessToken);
      const items: ChatGifCatalogItem[] = Array.isArray(data.items)
        ? data.items.filter(
            (item: ChatGifCatalogItem) =>
              typeof item?.id === "string" && typeof item?.uri === "string",
          )
        : [];
      return {
        items,
        totalCount: Number(data.totalCount) || items.length,
        nextOffset: typeof data.nextOffset === "number" ? data.nextOffset : null,
        provider: "giphy",
      };
    },
  };
}
