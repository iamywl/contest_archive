/**
 * 공용 mock-fixture 로더.
 *
 * 저장소 루트의 `_여분_공유/mock-fixtures/` 파일을 서버 런타임에서 직접 읽는다.
 * 인증키(PUBLIC_DATA_API_KEY)가 비어있거나 네트워크가 불가한 심사 환경을 대비.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

// dev/run-mate/src/lib → 3단계 위가 저장소 루트의 `_여분_공유`.
// `process.cwd()` 는 `pnpm dev|build` 실행 위치(`dev/run-mate`) 기준.
const SHARED_MOCK_DIR = join(
  process.cwd(),
  "..",
  "..",
  "..",
  "_여분_공유",
  "mock-fixtures",
);

export async function loadMock<T = unknown>(fileName: string): Promise<T> {
  const path = join(SHARED_MOCK_DIR, fileName);
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as T;
}
