import { distanceMeters } from "./geo";
import type { LatLng, Poi, PoiType, RouteTone } from "./types";

/**
 * 밝기 점수 가중치 규칙 엔진 (제안서 §2.2 (1)).
 *
 * 각 경로 지점에서 반경 50m 내 POI 개수를 세고 POI 유형별 가중치를 곱해 누적,
 * 경로 전체로 평균 후 시그모이드로 [0,1] 에 매핑한다. AI 미사용, 순수 TS 함수.
 */

const KERNEL_RADIUS_M = 50;

/** 유형별 가중치. 합산값이 아니라 "1 POI 당 기여도". */
const WEIGHTS: Record<PoiType, number> = {
  cctv: 0.35, // 공공 CCTV: 감시 커버리지
  lamp: 0.2, // 가로등·보안등: 밝기 직접 기여
  cvs: 0.25, // 24시 편의점: 심야 피난처·자연감시
  station: 0.4, // 지구대·파출소: 가장 강한 안전지점
  scout: 0.15, // 안심귀가 스카우트 수요 지점
};

/** 시간대 보정치. 낮 시간엔 가점, 심야 0~4시엔 감점. */
function timeMultiplier(date: Date): number {
  const h = date.getHours();
  if (h >= 6 && h < 18) return 1.1;
  if (h >= 18 && h < 22) return 1.0;
  if (h >= 22 || h < 2) return 0.85;
  return 0.7; // 02~06 심야
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * 경로 폴리라인과 주변 POI 를 받아 밝기 점수 S ∈ [0,1] 계산.
 *
 * @param path 경로 좌표열
 * @param pois 주변 POI (이미 bbox 로 필터링되었다고 가정)
 * @param now 기준 시각 (테스트 주입용)
 */
export function scoreBrightness(
  path: LatLng[],
  pois: Poi[],
  now: Date = new Date(),
): number {
  if (path.length === 0) return 0;

  let accum = 0;
  for (const point of path) {
    let local = 0;
    for (const poi of pois) {
      const d = distanceMeters(point, poi);
      if (d > KERNEL_RADIUS_M) continue;
      // 거리 감쇠 (0m=1.0, 50m=0.0)
      const decay = 1 - d / KERNEL_RADIUS_M;
      local += WEIGHTS[poi.type] * decay;
    }
    accum += local;
  }

  const mean = accum / path.length;
  // mean 은 경로마다 0~2+ 범위. sigmoid 로 스쿠시.
  const base = sigmoid(mean * 1.8 - 1.2);
  return Math.max(0, Math.min(1, base * timeMultiplier(now)));
}

/** 밝기 점수 → 신호등. */
export function brightnessTone(score: number): RouteTone {
  if (score >= 0.7) return "ok";
  if (score >= 0.4) return "warn";
  return "bad";
}

/** 신호등 → 한국어 라벨. */
export function toneLabel(tone: RouteTone): string {
  switch (tone) {
    case "ok":
      return "🟢 밝은 길";
    case "warn":
      return "🟡 보통";
    case "bad":
      return "🔴 어두움";
  }
}
