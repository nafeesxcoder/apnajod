/** On your own story: "Seen by 12 · ❤ 3", or "Responses" before anyone has. */
export function storyActivityLabel(views: number, likes: number): string {
  if (!views && !likes) return "Responses";
  const seen = `Seen by ${views}`;
  return likes ? `${seen} · ❤ ${likes}` : seen;
}
