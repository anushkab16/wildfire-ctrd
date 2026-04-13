import { readStore, writeStore, type RiskRunRecord } from "@/lib/store/schema";

export async function addRiskRun(payload: Omit<RiskRunRecord, "id" | "createdAt">) {
  const store = await readStore();
  const record: RiskRunRecord = {
    ...payload,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.riskRuns.unshift(record);
  store.riskRuns = store.riskRuns.slice(0, 1000);
  await writeStore(store);
  return record;
}

export async function listRiskRuns(limit = 50) {
  const store = await readStore();
  return store.riskRuns.slice(0, limit);
}

export async function listRiskRunsByRegion(region?: string, limit = 100) {
  const store = await readStore();
  if (!region) return store.riskRuns.slice(0, limit);
  return store.riskRuns
    .filter((run) => {
      const key = `${run.region.latitude.toFixed(2)},${run.region.longitude.toFixed(2)}`;
      return key === region;
    })
    .slice(0, limit);
}

