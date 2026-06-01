// All dates are stored as ISO date strings: "YYYY-MM-DD"

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(isoA, isoB) {
  const a = fromISO(isoA);
  const b = fromISO(isoB);
  return Math.round((b - a) / 86400000);
}

export function minDate(a, b) {
  return a <= b ? a : b;
}

export function maxDate(a, b) {
  return a >= b ? a : b;
}

export function getDaysInMonth(year, month) {
  // month is 0-indexed
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year, month) {
  // Returns 0=Sun, 1=Mon, ..., 6=Sat
  return new Date(year, month, 1).getDay();
}

export function monthStartISO(year, month) {
  return toISO(new Date(year, month, 1));
}

export function monthEndISO(year, month) {
  return toISO(new Date(year, month + 1, 0));
}

export function todayISO() {
  return toISO(new Date());
}

export function formatMonthYear(year, month) {
  return new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
