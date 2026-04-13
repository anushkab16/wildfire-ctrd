import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type WatchlistRecord = {
  id: string;
  name: string;
  region: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  thresholds: {
    yellow: number;
    orange: number;
    red: number;
    critical: number;
  };
  channels: {
    emails: string[];
    telegramChatIds: string[];
  };
  enabled: boolean;
  createdAt: string;
};

export type RiskRunRecord = {
  id: string;
  requestId: string;
  createdAt: string;
  region: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  latestRisk: number;
  latestLevel: string;
  dominantDriver: string;
  hotspotsCount: number;
  latencyMs: number;
};

export type AlertRecord = {
  id: string;
  runId: string;
  requestId: string;
  createdAt: string;
  level: string;
  triggered: boolean;
  recipients: string[];
  status: "triggered" | "delivered" | "acknowledged" | "failed";
  acknowledgedAt: string | null;
};

type AppStore = {
  watchlists: WatchlistRecord[];
  riskRuns: RiskRunRecord[];
  alerts: AlertRecord[];
};

const STORE_PATH = path.resolve(process.cwd(), ".data", "store.json");

const EMPTY_STORE: AppStore = {
  watchlists: [],
  riskRuns: [],
  alerts: [],
};

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

export async function readStore(): Promise<AppStore> {
  await ensureStoreFile();
  const raw = await readFile(STORE_PATH, "utf8");
  try {
    return JSON.parse(raw) as AppStore;
  } catch {
    return { ...EMPTY_STORE };
  }
}

export async function writeStore(store: AppStore) {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

