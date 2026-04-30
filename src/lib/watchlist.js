const WATCHLIST_KEY = 'techbidly.watchlist.listingIds';
const WATCHLIST_EVENT = 'techbidly:watchlist-changed';

function toListingId(value) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

export function readWatchlistIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(toListingId).filter((id) => id !== null))];
  } catch {
    return [];
  }
}

function writeWatchlistIds(ids) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail: ids }));
}

export function isListingWatchlisted(listingId) {
  const id = toListingId(listingId);
  if (id === null) return false;
  return readWatchlistIds().includes(id);
}

export function toggleListingWatchlist(listingId) {
  const id = toListingId(listingId);
  if (id === null) return false;
  const ids = readWatchlistIds();
  const nextIds = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
  writeWatchlistIds(nextIds);
  return nextIds.includes(id);
}

export function subscribeToWatchlistChanges(onChange) {
  if (typeof window === 'undefined') return () => {};
  const notify = () => onChange(readWatchlistIds());
  const customHandler = () => notify();
  const storageHandler = (event) => {
    if (event.key === WATCHLIST_KEY) notify();
  };

  window.addEventListener(WATCHLIST_EVENT, customHandler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(WATCHLIST_EVENT, customHandler);
    window.removeEventListener('storage', storageHandler);
  };
}
