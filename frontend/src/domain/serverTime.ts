/**
 * Times from our server.
 *
 * The database keeps every time in UTC and sends it as plain text with no
 * zone, like "2026-11-15 06:30:00.123456". A phone reading that text on its
 * own takes it as its own local time, so in India everything looked five and
 * a half hours old (a story posted now said "5h"). Read such text as UTC here.
 *
 * Text that already carries a zone ("...Z", "+05:30"), numbers and Dates are
 * left as they are.
 */
const PLAIN = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(\.\d+)?$/;

export function serverMs(value: string | number | Date | null | undefined): number {
  if (value === null || value === undefined || value === "") return Number.NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const text = String(value).trim();
  const plain = PLAIN.exec(text);
  if (plain) {
    // Some phones cannot read six digits after the dot: keep three.
    const fraction = plain[4] ? plain[4].slice(0, 4).padEnd(4, "0") : "";
    return Date.parse(`${plain[1]}T${plain[2]}${plain[3] ?? ":00"}${fraction}Z`);
  }
  return Date.parse(text);
}

export function serverDate(value: string | number | Date | null | undefined): Date {
  return new Date(serverMs(value));
}
