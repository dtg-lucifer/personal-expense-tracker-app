/**
 * lib/dateUtils.ts
 *
 * Shared date-formatting utilities.
 * All user-visible dates in the app go through these helpers.
 *
 * Formats:
 *   formatDate("2026-07-07")           → "7th July, 2026"
 *   formatDateShort("2026-07-07")      → "7th July"          (no year)
 *   formatDateRange("2026-07-07", "2026-07-13")  → "7th July – 13th July"
 *   formatMonthYear("2026-07")         → "July 2026"
 */

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parse YYYY-MM-DD without timezone shift */
function parseISO(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

/**
 * "7th July, 2026"
 */
export function formatDate(iso: string): string {
  const { y, m, d } = parseISO(iso);
  return `${d}${ordinalSuffix(d)} ${MONTHS[m - 1]}, ${y}`;
}

/**
 * "7th July"  (no year — for ranges within the same year context)
 */
export function formatDateShort(iso: string): string {
  const { m, d } = parseISO(iso);
  return `${d}${ordinalSuffix(d)} ${MONTHS[m - 1]}`;
}

/**
 * "7th July – 13th July"
 * If the two dates are in different years:  "31st Dec, 2025 – 1st Jan, 2026"
 */
export function formatDateRange(startIso: string, endIso: string): string {
  const s = parseISO(startIso);
  const e = parseISO(endIso);
  if (s.y !== e.y) {
    return `${formatDate(startIso)} – ${formatDate(endIso)}`;
  }
  return `${formatDateShort(startIso)} – ${formatDateShort(endIso)}`;
}

/**
 * "July 2026"  — for monthly period labels
 */
export function formatMonthYear(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
