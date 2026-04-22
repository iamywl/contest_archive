/**
 * 러닝 신호등 규칙 엔진.
 *
 * 대기질(CAI·PM2.5·PM10) + 날씨(기온·강수·바람)를 입력으로 받아
 * 🟢/🟡/🔴 한 장을 만든다. Phase 1 에선 단순 규칙이지만, 향후 LightGBM
 * 가중치로 치환 가능하게 순수 함수로 유지.
 */

import type { SignalResponse, SignalSlot, SignalTone } from "./types";

type AqMock = {
  stationName: string;
  cai: { value: number; grade: number; gradeLabel: string };
  pm10: { value: number };
  pm25: { value: number };
};

type WeatherMock = {
  now: {
    temp_c: number;
    feels_like_c: number;
    humidity: number;
    wind_ms: number;
    precip_mm: number;
    sky: string;
  };
  hourly: { at: string; temp_c: number; pop: number; precip_mm: number }[];
};

const TONE_EMOJI: Record<SignalTone, string> = {
  ok: "🟢",
  warn: "🟡",
  bad: "🔴",
};

function worse(a: SignalTone, b: SignalTone): SignalTone {
  const order: SignalTone[] = ["ok", "warn", "bad"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

function aqTone(pm25: number, pm10: number, cai: number): SignalTone {
  if (pm25 >= 36 || pm10 >= 81 || cai >= 101) return "bad";
  if (pm25 >= 16 || pm10 >= 31 || cai >= 51) return "warn";
  return "ok";
}

function weatherTone(
  tempC: number,
  precipMm: number,
  windMs: number,
  humidity: number,
): SignalTone {
  if (precipMm >= 1 || tempC >= 31 || tempC <= -5 || windMs >= 10) return "bad";
  if (precipMm > 0 || tempC >= 27 || tempC <= 2 || windMs >= 7 || humidity >= 85) {
    return "warn";
  }
  return "ok";
}

function buildReason(
  aq: AqMock,
  weather: WeatherMock["now"],
  tone: SignalTone,
): string {
  if (tone === "bad") {
    if (weather.precip_mm >= 1) return `강수 ${weather.precip_mm}mm — 실내 러닝 권장`;
    if (aq.pm25.value >= 36) return `초미세먼지 ${aq.pm25.value}㎍/㎥ — 야외 자제`;
    if (weather.temp_c >= 31) return `체감 ${weather.feels_like_c}°C — 일사·탈수 위험`;
    return "기상·대기 모두 위험 — 실내 대체 권장";
  }
  if (tone === "warn") {
    if (aq.cai.value >= 51) return `대기질 '보통' (CAI ${aq.cai.value}) · 마스크 권장`;
    if (weather.humidity >= 85) return `습도 ${weather.humidity}% — 페이스 낮추고 수분`;
    if (weather.temp_c >= 27) return `기온 ${weather.temp_c}°C — 이른 아침 권장`;
    return "무리 없음 — 상태 확인 후 짧은 러닝";
  }
  return `대기 좋음 (CAI ${aq.cai.value}) · 기온 ${weather.temp_c}°C — 최적 컨디션`;
}

function buildSlots(
  aq: AqMock,
  weather: WeatherMock,
): SignalSlot[] {
  const baseAqTone = aqTone(aq.pm25.value, aq.pm10.value, aq.cai.value);
  const hourlyByHour = new Map<number, WeatherMock["hourly"][number]>();
  for (const h of weather.hourly) {
    const hour = new Date(h.at).getHours();
    hourlyByHour.set(hour, h);
  }

  const candidates: Array<{ label: string; range: string; hour: number }> = [
    { label: "아침", range: "06:00-08:00", hour: 7 },
    { label: "저녁", range: "17:00-19:00", hour: 18 },
    { label: "야간", range: "20:00-22:00", hour: 21 },
  ];

  return candidates.map(({ label, range, hour }) => {
    const slot =
      hourlyByHour.get(hour) ??
      weather.hourly[Math.min(weather.hourly.length - 1, 2)];
    const wTone = weatherTone(
      slot.temp_c,
      slot.precip_mm,
      weather.now.wind_ms,
      weather.now.humidity,
    );
    const tone = worse(baseAqTone, wTone);
    const reason =
      slot.precip_mm >= 1
        ? `${slot.precip_mm}mm 강수 예상`
        : slot.pop >= 60
          ? `강수확률 ${slot.pop}%`
          : `기온 ${slot.temp_c}°C · 강수확률 ${slot.pop}%`;
    return { label, range, tone, reason };
  });
}

export function computeSignal(
  aq: AqMock,
  weather: WeatherMock,
): SignalResponse {
  const aTone = aqTone(aq.pm25.value, aq.pm10.value, aq.cai.value);
  const wTone = weatherTone(
    weather.now.temp_c,
    weather.now.precip_mm,
    weather.now.wind_ms,
    weather.now.humidity,
  );
  const tone = worse(aTone, wTone);

  const headline =
    tone === "ok"
      ? "오늘 러닝 좋아요"
      : tone === "warn"
        ? "러닝 가능 — 주의"
        : "오늘은 실내 권장";

  return {
    tone,
    emoji: TONE_EMOJI[tone],
    headline,
    reason: buildReason(aq, weather.now, tone),
    slots: buildSlots(aq, weather),
    aq: {
      stationName: aq.stationName,
      cai: aq.cai.value,
      grade: aq.cai.grade,
      gradeLabel: aq.cai.gradeLabel,
      pm10: aq.pm10.value,
      pm25: aq.pm25.value,
    },
    weather: {
      tempC: weather.now.temp_c,
      feelsLikeC: weather.now.feels_like_c,
      humidity: weather.now.humidity,
      windMs: weather.now.wind_ms,
      precipMm: weather.now.precip_mm,
      sky: weather.now.sky,
    },
    updatedAt: new Date().toISOString(),
  };
}
