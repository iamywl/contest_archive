import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Poi } from "./types";

/**
 * CCTV fixture 는 `_여분_공유/mock-fixtures/cctv.json` 을 참조한다.
 * 서버 전용 (fs 사용). Route Handler 에서만 호출.
 */
export async function loadCctvPois(): Promise<Poi[]> {
  const path = join(
    process.cwd(),
    "..",
    "..",
    "..",
    "_여분_공유",
    "mock-fixtures",
    "cctv.json",
  );
  try {
    const raw = await readFile(path, "utf8");
    const json = JSON.parse(raw) as { items?: Poi[] };
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}
