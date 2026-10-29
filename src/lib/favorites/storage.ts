import { z } from "zod";

const STORAGE_PREFIX = "usta-rotam.favorites.v1";
const MAX_FAVORITES = 200;

const EMPTY_FAVORITES: readonly string[] = [];

const storedFavoritesSchema = z.object({
  version: z.literal(1),
  ids: z.array(z.string().min(1)).max(MAX_FAVORITES),
});

/**
 * `useSyncExternalStore` aynı referansı beklediği için kullanıcı başına son
 * okunan liste bellekte tutulur; yalnızca gerçek bir değişimde yenilenir.
 */
const snapshotCache = new Map<string, readonly string[]>();

export function favoritesStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

function readFavorites(userId: string): readonly string[] {
  if (typeof window === "undefined") {
    return EMPTY_FAVORITES;
  }

  try {
    const raw = window.localStorage.getItem(favoritesStorageKey(userId));

    if (!raw) {
      return EMPTY_FAVORITES;
    }

    const parsed = storedFavoritesSchema.safeParse(JSON.parse(raw));

    return parsed.success ? [...new Set(parsed.data.ids)] : EMPTY_FAVORITES;
  } catch {
    return EMPTY_FAVORITES;
  }
}

function writeFavorites(userId: string, ids: readonly string[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const payload = storedFavoritesSchema.parse({
      version: 1,
      ids: [...new Set(ids)].slice(0, MAX_FAVORITES),
    });

    window.localStorage.setItem(
      favoritesStorageKey(userId),
      JSON.stringify(payload),
    );

    return true;
  } catch {
    return false;
  }
}

export function getFavoritesSnapshot(
  userId: string | null,
): readonly string[] {
  if (!userId) {
    return EMPTY_FAVORITES;
  }

  const next = readFavorites(userId);
  const cached = snapshotCache.get(userId);

  if (cached && sameIds(cached, next)) {
    return cached;
  }

  snapshotCache.set(userId, next);

  return next;
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function getFavoritesServerSnapshot(): readonly string[] {
  return EMPTY_FAVORITES;
}

export function setFavorites(
  userId: string,
  ids: readonly string[],
): boolean {
  const next = [...new Set(ids)].slice(0, MAX_FAVORITES);

  if (!writeFavorites(userId, next)) {
    return false;
  }

  snapshotCache.set(userId, next);
  notify(userId);

  return true;
}

const listeners = new Map<string, Set<() => void>>();

function notify(userId: string): void {
  listeners.get(userId)?.forEach((listener) => listener());
}

export function subscribeToFavorites(
  userId: string,
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let userListeners = listeners.get(userId);

  if (!userListeners) {
    userListeners = new Set();
    listeners.set(userId, userListeners);
  }

  userListeners.add(listener);

  const key = favoritesStorageKey(userId);

  function handleStorage(event: StorageEvent) {
    if (event.key !== key && event.key !== null) {
      return;
    }

    snapshotCache.set(userId, readFavorites(userId));
    listener();
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    userListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);

    if (userListeners.size === 0) {
      listeners.delete(userId);
    }
  };
}
