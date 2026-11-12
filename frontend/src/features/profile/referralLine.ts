import type { ReferralSummary } from "../../api/profileApi";

/** "2 friends joined · 2 Boosts earned", or "" before anyone has joined. */
export function referralLine(summary: ReferralSummary | null): string {
  if (!summary || summary.joined <= 0) return "";
  const friends = `${summary.joined} ${summary.joined === 1 ? "friend" : "friends"} joined`;
  const boosts = `${summary.boostsEarned} ${summary.boostsEarned === 1 ? "Boost" : "Boosts"} earned`;
  return `${friends} · ${boosts}`;
}
