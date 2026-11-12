const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-12" -> "12 Nov" */
export function dayLabel(day: string | undefined): string {
  const [, month, date] = String(day ?? "").split("-").map(Number);
  if (!month || !date) return day ?? "";
  return `${date} ${MONTHS[month - 1]}`;
}

export function total(values: number[]): number {
  return values.reduce((sum, value) => sum + (Number(value) || 0), 0);
}

/** Average per day, one decimal at most. */
export function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((total(values) / values.length) * 10) / 10;
}

/** Paise -> "₹1,249" (no paise unless there are some). */
export function rupees(paise: number): string {
  const value = (Number(paise) || 0) / 100;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Share of a whole as a whole-number percent; 0 when the whole is 0. */
export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
