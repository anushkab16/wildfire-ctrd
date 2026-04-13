import { readStore, writeStore, type WatchlistRecord } from "@/lib/store/schema";

export async function listWatchlists() {
  const store = await readStore();
  return store.watchlists;
}

export async function addWatchlist(
  payload: Omit<WatchlistRecord, "id" | "createdAt">,
) {
  const store = await readStore();
  const record: WatchlistRecord = {
    ...payload,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.watchlists.unshift(record);
  await writeStore(store);
  return record;
}

export async function updateWatchlistEnabled(id: string, enabled: boolean) {
  const store = await readStore();
  const idx = store.watchlists.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  store.watchlists[idx] = { ...store.watchlists[idx], enabled };
  await writeStore(store);
  return store.watchlists[idx];
}

