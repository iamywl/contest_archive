/** 러닝 신호등 타입 정의. */

export type SignalTone = "ok" | "warn" | "bad";

export type SignalSlot = {
  /** 아침 / 점심 / 저녁 등 레이블. */
  label: string;
  /** 권장 시간 범위 (예: "06:00-08:00"). */
  range: string;
  tone: SignalTone;
  /** 한 줄 이유. */
  reason: string;
};

export type SignalResponse = {
  tone: SignalTone;
  emoji: string;
  headline: string;
  reason: string;
  slots: SignalSlot[];
  aq: {
    stationName: string;
    cai: number;
    grade: number;
    gradeLabel: string;
    pm10: number;
    pm25: number;
  };
  weather: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windMs: number;
    precipMm: number;
    sky: string;
  };
  updatedAt: string;
};

export type BikeStation = {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lng: number;
  totalDocks: number;
  availableBikes: number;
  availableDocks: number;
  status: string;
};

export type BikesResponse = {
  items: BikeStation[];
  totalCount: number;
};

export type CourseRoute = {
  id: "3km" | "5km" | "10km";
  label: string;
  distanceKm: number;
  estMinutes: number;
  tone: SignalTone;
  polyline: [number, number][];
};
