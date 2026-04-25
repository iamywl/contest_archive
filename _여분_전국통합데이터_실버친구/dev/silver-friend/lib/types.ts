/**
 * 실버친구 공용 도메인 타입.
 * 공공데이터 원천 스키마(무더위/한파 쉼터, 경로당)를 반영.
 */

export type ShelterType = "무더위쉼터" | "한파쉼터";

export type Shelter = {
  id: string;
  name: string;
  type: ShelterType;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  operatingHours: string;
  aircon: boolean;
  accessible: boolean;
  phone: string | null;
};

export type SheltersResponse = {
  _mock?: boolean;
  _source?: string;
  _updated?: string;
  totalCount: number;
  items: Shelter[];
};

export type WeatherSummary = {
  temperature: number;
  sky: "맑음" | "구름많음" | "흐림" | "비" | "눈";
  pm10: number;
  heatIndex: "안전" | "주의" | "경고" | "위험";
};
