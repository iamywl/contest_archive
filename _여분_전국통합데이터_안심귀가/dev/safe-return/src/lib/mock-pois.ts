import type { Poi } from "./types";

/**
 * 서울 관악구 신림역 일대 MVP mock POI. 제안서 §5.2 "서울 관악·동작 시뮬레이션
 * 셋" 을 1화면용으로 축소한 것. CCTV 만 `_여분_공유/mock-fixtures/cctv.json` 에
 * 분리 저장되며, 나머지 4종은 아래 inline 으로 정의한다. 실데이터 아님.
 */

export const MOCK_CENTER = { lat: 37.4842, lng: 126.9293 };

export const MOCK_ORIGIN_LABEL = "신림역 2번출구";
export const MOCK_DESTINATION_LABEL = "신원초교 앞";

export const MOCK_ORIGIN = { lat: 37.4845, lng: 126.9298 };
export const MOCK_DESTINATION = { lat: 37.4878, lng: 126.9322 };

export const LAMP_POIS: Poi[] = [
  { id: "lamp-1", type: "lamp", lat: 37.4847, lng: 126.93, name: "가로등 LED 01" },
  { id: "lamp-2", type: "lamp", lat: 37.4852, lng: 126.9306, name: "가로등 LED 02" },
  { id: "lamp-3", type: "lamp", lat: 37.4859, lng: 126.9311, name: "가로등 LED 03" },
  { id: "lamp-4", type: "lamp", lat: 37.4866, lng: 126.9316, name: "보안등 04" },
  { id: "lamp-5", type: "lamp", lat: 37.4873, lng: 126.932, name: "보안등 05" },
  { id: "lamp-6", type: "lamp", lat: 37.488, lng: 126.9325, name: "가로등 LED 06" },
  { id: "lamp-7", type: "lamp", lat: 37.4835, lng: 126.9283, name: "가로등 LED 07" },
  { id: "lamp-8", type: "lamp", lat: 37.4825, lng: 126.9278, name: "보안등 08" },
];

export const CVS_POIS: Poi[] = [
  { id: "cvs-1", type: "cvs", lat: 37.4846, lng: 126.9303, name: "GS25 신림역점 (24h)" },
  { id: "cvs-2", type: "cvs", lat: 37.4864, lng: 126.9315, name: "CU 난곡로점 (24h)" },
  { id: "cvs-3", type: "cvs", lat: 37.4876, lng: 126.9323, name: "세븐일레븐 신원점 (24h)" },
  { id: "cvs-4", type: "cvs", lat: 37.4823, lng: 126.9276, name: "이마트24 신림골목점" },
  { id: "cvs-5", type: "cvs", lat: 37.4832, lng: 126.9287, name: "GS25 신림로점 (24h)" },
];

export const STATION_POIS: Poi[] = [
  { id: "stn-1", type: "station", lat: 37.485, lng: 126.9302, name: "관악경찰서 신림지구대" },
  { id: "stn-2", type: "station", lat: 37.4881, lng: 126.9329, name: "난곡파출소" },
];

export const SCOUT_POIS: Poi[] = [
  { id: "sct-1", type: "scout", lat: 37.4857, lng: 126.9309, name: "안심귀가 스카우트 집결지 A" },
  { id: "sct-2", type: "scout", lat: 37.487, lng: 126.9318, name: "안심귀가 스카우트 집결지 B" },
];

/** 모든 POI (CCTV 는 JSON 로더에서 합쳐서 사용). */
export const NON_CCTV_POIS: Poi[] = [
  ...LAMP_POIS,
  ...CVS_POIS,
  ...STATION_POIS,
  ...SCOUT_POIS,
];
