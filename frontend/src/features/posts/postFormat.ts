/**
 * Small words under a post, the way Instagram writes them.
 */

/** "now", "5m", "3h", "2d", "4w", then a date ("12 Nov", "12 Nov 2024"). */
export function timeAgo(value: string | number | Date, now: number = Date.now()): string {
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return "";
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 35) return `${Math.floor(days / 7)}w`;
  const date = new Date(at);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return `${date.getDate()} ${month}${sameYear ? "" : ` ${date.getFullYear()}`}`;
}

/** "1 like", "23 likes", "1.2K likes". */
export function countLabel(count: number, one: string, many: string): string {
  const n = Math.max(0, Math.floor(count || 0));
  const shown = n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : n >= 10_000 ? `${Math.floor(n / 1000)}K`
    : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`
    : String(n);
  return `${shown} ${n === 1 ? one : many}`;
}

/** The text a share sends: the caption (if any) and the link. */
export function shareText(username: string, caption: string, link: string): string {
  const line = caption.trim() ? `@${username}: ${caption.trim().slice(0, 120)}` : `A post by @${username} on Apnajoda`;
  return `${line}\n${link}`;
}
