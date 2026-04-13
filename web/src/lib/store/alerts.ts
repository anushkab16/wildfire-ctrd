import { readStore, writeStore, type AlertRecord } from "@/lib/store/schema";

export async function addAlert(payload: Omit<AlertRecord, "id" | "createdAt" | "acknowledgedAt">) {
  const store = await readStore();
  const record: AlertRecord = {
    ...payload,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
  };
  store.alerts.unshift(record);
  store.alerts = store.alerts.slice(0, 2000);
  await writeStore(store);
  return record;
}

export async function listAlerts(status?: AlertRecord["status"], limit = 200) {
  const store = await readStore();
  if (!status) return store.alerts.slice(0, limit);
  return store.alerts.filter((a) => a.status === status).slice(0, limit);
}

export async function acknowledgeAlert(id: string) {
  const store = await readStore();
  const idx = store.alerts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  store.alerts[idx] = {
    ...store.alerts[idx],
    status: "acknowledged",
    acknowledgedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.alerts[idx];
}

