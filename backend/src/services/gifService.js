// GIF search proxy. The GIPHY key stays on the server; the app only talks to
// our /chat/gifs endpoint. Without GIPHY_API_KEY the endpoint reports
// `configured: false` and the app keeps using its built-in reaction catalog.
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

function isConfigured() {
  return Boolean(process.env.GIPHY_API_KEY);
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function pickUrl(images, keys) {
  for (const key of keys) {
    const url = images?.[key]?.url;
    if (url) return url;
  }
  return '';
}

async function searchGifs({ query = '', offset = 0, limit = 36 } = {}) {
  if (!isConfigured()) {
    const err = new Error('GIF search is not configured on the server.');
    err.status = 503;
    throw err;
  }
  const q = String(query).trim().slice(0, 80);
  const safeLimit = clampInt(limit, 1, 50, 36);
  const safeOffset = clampInt(offset, 0, 4999, 0);
  const params = new URLSearchParams({
    api_key: process.env.GIPHY_API_KEY,
    limit: String(safeLimit),
    offset: String(safeOffset),
    rating: 'pg-13',
    bundle: 'messaging_non_clips',
  });
  if (q) {
    params.set('q', q);
    params.set('lang', 'en');
  }
  const url = `${GIPHY_BASE}/${q ? 'search' : 'trending'}?${params}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    const err = new Error('GIF provider is temporarily unavailable.');
    err.status = 502;
    throw err;
  }
  const body = await response.json();
  const items = (body.data || [])
    .map((gif) => {
      // Small, fast files for chat: fixed_height first, original as fallback.
      const uri = pickUrl(gif.images, ['fixed_height', 'downsized', 'original']);
      if (!uri) return null;
      const title = (gif.title || 'GIF').replace(/\s*GIF( by .*)?$/i, '').trim() || 'GIF';
      return {
        id: `giphy-${gif.id}`,
        title,
        style: gif.username ? `@${gif.username}` : 'GIPHY',
        uri,
        searchText: title.toLowerCase(),
        provider: 'giphy',
        attribution: 'Powered by GIPHY',
      };
    })
    .filter(Boolean);
  const total = Number(body.pagination?.total_count ?? items.length);
  const next = safeOffset + (body.data?.length || 0);
  return {
    configured: true,
    provider: 'GIPHY',
    items,
    totalCount: total,
    nextOffset: items.length && next < Math.min(total, 5000) ? next : null,
  };
}

module.exports = { isConfigured, searchGifs };
