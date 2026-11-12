/**
 * Intent badges - small chips that say, at a glance, what someone wants.
 *
 * Built only from answers the member gave in their intent and alignment
 * questions, never guessed. Matching is by keyword rather than exact text,
 * so older wordings ("Wants children", "Marriage in 1–2 years") still map.
 * At most five, in a fixed order, so every profile reads the same way.
 */
export type IntentBadgeInput = {
  intent?: string;
  timeline?: string;
  children?: string;
  family?: string;
  relocation?: string;
};

export type IntentBadge = { key: string; label: string };

const has = (value: string | undefined, pattern: RegExp) =>
  !!value && pattern.test(value.toLowerCase());

export function intentBadges(input: IntentBadgeInput): IntentBadge[] {
  const badges: IntentBadge[] = [];

  if (has(input.intent, /marriage|marry/)) {
    badges.push({ key: "intent", label: "💍 Marriage-minded" });
  } else if (has(input.intent, /long[- ]?term/)) {
    badges.push({ key: "intent", label: "❤️ Long-term" });
  }

  if (has(input.timeline, /1\s*[–-]\s*2|within a year|1 year/)) {
    badges.push({ key: "timeline", label: "⏱️ Ready to settle soon" });
  } else if (has(input.timeline, /2\s*[–-]\s*3/)) {
    badges.push({ key: "timeline", label: "🗓️ Marriage in 2–3 years" });
  } else if (has(input.timeline, /feels ready|no rush/)) {
    badges.push({ key: "timeline", label: "🌱 No rush" });
  }

  if (has(input.children, /do not|don't|no children|child-?free/)) {
    badges.push({ key: "children", label: "🚫 No kids" });
  } else if (has(input.children, /definitely|wants? children|want kids/)) {
    badges.push({ key: "children", label: "👶 Wants kids" });
  } else if (has(input.children, /open/)) {
    badges.push({ key: "children", label: "🙂 Open to kids" });
  }

  if (has(input.family, /deeply|family first|very important/)) {
    badges.push({ key: "family", label: "🏡 Family First" });
  } else if (has(input.family, /boundaries|balanced/)) {
    badges.push({ key: "family", label: "🤝 Family balanced" });
  } else if (has(input.family, /independent/)) {
    badges.push({ key: "family", label: "🗝️ Independent couple" });
  }

  if (has(input.relocation, /prefer to stay|stay in/)) {
    badges.push({ key: "relocation", label: "📍 Rooted in their city" });
  } else if (has(input.relocation, /^yes|open/)) {
    badges.push({ key: "relocation", label: "✈️ Open to relocate" });
  }

  return badges.slice(0, 5);
}
