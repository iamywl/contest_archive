/**
 * Mock fixture 로더.
 *
 * `_여분_공유/mock-fixtures/*.json` 을 Route Handler 에서 읽어 POI 타입으로 반환.
 * 공공 API 키 보유 시 `_여분_공유/lib/public-api-proxy.ts` 로 교체 (Phase 2).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  KidsLibrary,
  NursingRoom,
  Park,
  Parking,
  Toilet,
} from "./types";

const MOCK_DIR = join(process.cwd(), "..", "..", "..", "_여분_공유", "mock-fixtures");

type Envelope<T> = { items: T[] };

async function loadJson<T>(file: string): Promise<T> {
  const raw = await readFile(join(MOCK_DIR, file), "utf8");
  return JSON.parse(raw) as T;
}

export async function loadParking(): Promise<Parking[]> {
  const data = await loadJson<Envelope<Parking>>("parking.json");
  return data.items;
}

export async function loadToilets(): Promise<Toilet[]> {
  const data = await loadJson<Envelope<Toilet>>("toilets.json");
  return data.items;
}

export async function loadNursing(): Promise<NursingRoom[]> {
  const data = await loadJson<Envelope<NursingRoom>>("nursing.json");
  return data.items;
}

export async function loadKidsLib(): Promise<KidsLibrary[]> {
  const data = await loadJson<Envelope<KidsLibrary>>("kidslib.json");
  return data.items;
}

export async function loadParks(): Promise<Park[]> {
  const data = await loadJson<Envelope<Park>>("parks.json");
  return data.items;
}

export async function loadWeatherSummary(): Promise<string> {
  try {
    const raw = await readFile(join(MOCK_DIR, "weather.json"), "utf8");
    const w = JSON.parse(raw) as {
      now?: { sky?: string; temp_c?: number };
    };
    const sky = w.now?.sky ?? "맑음";
    const temp = w.now?.temp_c ?? 20;
    return `${sky} · ${temp}℃`;
  } catch {
    return "날씨 정보 없음";
  }
}
