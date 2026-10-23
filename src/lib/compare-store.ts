/**
 * The compare tray: up to four plugins picked from cards or detail pages,
 * kept in localStorage so the pick survives navigation, and announced with a
 * window event so every island and script on the page stays in step.
 */
export const COMPARE_MAX = 4;
const KEY = 'opendock:compare';
const EVENT = 'opendock:compare';

export interface CompareItem {
  /** slug */
  s: string;
  /** title, so the tray can label it without loading data */
  t: string;
}

export function getCompare(): CompareItem[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.s === 'string').slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

export function setCompare(items: CompareItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, COMPARE_MAX)));
  } catch {
    // Storage blocked: the tray just won't persist.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Fired instead of adding when the tray is full; the tray explains. */
export const COMPARE_FULL_EVENT = 'opendock:compare-full';

/** Adds or removes a plugin. Returns false when adding to a full tray. */
export function toggleCompare(item: CompareItem): boolean {
  const items = getCompare();
  if (items.some((x) => x.s === item.s)) {
    setCompare(items.filter((x) => x.s !== item.s));
    return true;
  }
  if (items.length >= COMPARE_MAX) {
    window.dispatchEvent(new CustomEvent(COMPARE_FULL_EVENT));
    return false;
  }
  setCompare([...items, item]);
  return true;
}

export function onCompareChange(cb: () => void): () => void {
  const storage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', storage);
  };
}
