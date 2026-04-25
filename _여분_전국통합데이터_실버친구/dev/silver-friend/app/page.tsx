"use client";

/**
 * 홈 — 화면 ① "오늘 갈 곳" 카드 (제안서 §2.1 ①)
 *
 * 구성:
 *   - 위치 버튼 → geolocation
 *   - 서버 `/api/shelters?near=lat,lng` 호출 → 가장 가까운 쉼터 1곳 카드
 *   - 기상 요약(모의) 뱃지
 *   - 음성 비서 (Web Speech API)
 *
 * 고령자 UI:
 *   - 최소 18px 폰트 (globals.css body), 주요 액션 28~36px
 *   - 터치 영역 48px 이상 (`min-h-touch`)
 *   - 고대비 팔레트 (`--color-a11y-*`), 아이콘 + 색 이중 인코딩
 */

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Shelter, SheltersResponse, WeatherSummary } from "@/lib/types";

// 서울시청 디폴트 좌표 (geolocation 미제공/거절 시).
const DEFAULT_COORDS: [number, number] = [37.5665, 126.978];

const MOCK_WEATHER: WeatherSummary = {
  temperature: 27,
  sky: "맑음",
  pm10: 58,
  heatIndex: "주의",
};

function heatBadgeTone(index: WeatherSummary["heatIndex"]) {
  switch (index) {
    case "위험":
      return "bg-a11y-bad text-white";
    case "경고":
      return "bg-a11y-bad/90 text-white";
    case "주의":
      return "bg-a11y-warn text-white";
    default:
      return "bg-a11y-ok text-white";
  }
}

export default function Home() {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Shelter | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "mock" | null>(null);

  // 음성 비서 상태
  const [isListening, setIsListening] = useState(false);
  const [assistantText, setAssistantText] = useState("무엇을 도와드릴까요?");
  const recognitionRef = useRef<any>(null);

  const speak = useCallback((text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // 이전 음성 중단
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 0.9; // 고령자를 위해 조금 천천히
      window.speechSynthesis.speak(utterance);
      setAssistantText(text);
    }
  }, []);

  const requestLocation = useCallback(() => {
    setErrorMsg(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMsg("이 기기에서 위치 정보를 지원하지 않아요. 기본 위치로 보여드릴게요.");
      setCoords(DEFAULT_COORDS);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords([pos.coords.latitude, pos.coords.longitude]);
        setLoading(false);
      },
      () => {
        setErrorMsg("위치 확인에 실패했어요. 기본 위치로 보여드릴게요.");
        setCoords(DEFAULT_COORDS);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("죄송합니다. 이 브라우저에서는 음성 인식을 지원하지 않아요.");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "ko-KR";
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Transcript:", transcript);
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === "no-speech") {
          speak("말씀이 들리지 않아요. 다시 한번 말씀해주시겠어요?");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    try {
      setIsListening(true);
      recognitionRef.current.start();
      speak("듣고 있어요. 말씀해주세요.");
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }, [speak]);

  const handleVoiceCommand = useCallback((command: string) => {
    if (command.includes("쉼터") || command.includes("어디 갈까") || command.includes("추천")) {
      if (recommendation) {
        speak(`가장 가까운 쉼터는 ${recommendation.name}입니다. ${recommendation.address}에 위치하고 있어요.`);
      } else {
        speak("먼저 내 위치로 찾기 버튼을 눌러서 쉼터를 찾아보세요.");
      }
    } else if (command.includes("날씨") || command.includes("온도")) {
      speak(`오늘 기온은 ${MOCK_WEATHER.temperature}도이고 하늘은 ${MOCK_WEATHER.sky}입니다. 미세먼지는 ${MOCK_WEATHER.pm10}으로 보통 수준입니다.`);
    } else if (command.includes("안녕")) {
      speak("안녕하세요! 무엇을 도와드릴까요? 쉼터나 날씨에 대해 물어보세요.");
    } else {
      speak(`"${command}"라고 말씀하셨군요. 쉼터나 날씨에 대해 물어봐주시면 답변해드릴게요.`);
    }
  }, [recommendation, speak]);

  useEffect(() => {
    if (!coords) return;
    const [lat, lng] = coords;
    setLoading(true);
    fetch(`/api/shelters?near=${lat},${lng}&radiusKm=5`)
      .then((r) => r.json() as Promise<SheltersResponse & { _mode?: string }>)
      .then((data) => {
        setRecommendation(data.items?.[0] ?? null);
        setMode((data._mode as "live" | "mock" | undefined) ?? null);
      })
      .catch(() => setErrorMsg("쉼터 정보를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [coords]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-[var(--text-a11y-2xl)] font-bold">실버친구</h1>
        <span
          className={`rounded-full px-3 py-1 text-[var(--text-a11y-sm)] font-semibold ${heatBadgeTone(MOCK_WEATHER.heatIndex)}`}
          aria-label={`폭염 ${MOCK_WEATHER.heatIndex}`}
        >
          폭염 {MOCK_WEATHER.heatIndex}
        </span>
      </header>

      {/* 음성 비서 섹션 */}
      <section 
        aria-labelledby="voice-heading"
        className="rounded-[var(--radius-a11y-card)] border-4 border-a11y-info bg-a11y-info/5 p-6 shadow-md"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 id="voice-heading" className="text-[var(--text-a11y-xl)] font-bold text-a11y-info">
            🎙️ 음성 비서
          </h2>
          <p className="text-[var(--text-a11y-lg)] font-medium min-h-[3rem]">
            {isListening ? "듣고 있습니다..." : assistantText}
          </p>
          <button
            type="button"
            onClick={startListening}
            disabled={isListening}
            className={`min-h-touch-lg w-full rounded-[var(--radius-a11y-btn)] px-8 py-6 text-[var(--text-a11y-xl)] font-bold text-white shadow-lg transition-all active:scale-95 ${
              isListening ? "bg-a11y-bad animate-pulse" : "bg-a11y-info hover:brightness-110"
            }`}
            aria-label="음성 비서 시작하기"
          >
            {isListening ? "🛑 듣는 중..." : "🗣️ 말씀하시려면 여기를 누르세요"}
          </button>
          <p className="text-[var(--text-a11y-sm)] text-a11y-text-muted">
            예: "쉼터 알려줘", "오늘 날씨 어때?"
          </p>
        </div>
      </section>

      <section aria-labelledby="today-heading" className="flex flex-col gap-4">
        <h2 id="today-heading" className="text-[var(--text-a11y-xl)] font-semibold">
          오늘 어디 갈까요?
        </h2>
        <button
          type="button"
          onClick={requestLocation}
          className="min-h-touch-lg rounded-[var(--radius-a11y-btn)] bg-a11y-ok px-6 py-4 text-[var(--text-a11y-lg)] font-bold text-white shadow-sm hover:brightness-110 focus-visible:ring-4 focus-visible:ring-a11y-focus"
          aria-label="내 위치로 가까운 쉼터 찾기"
        >
          📍 내 위치로 찾기
        </button>
        {errorMsg && (
          <p role="status" className="text-a11y-bad">
            {errorMsg}
          </p>
        )}
      </section>

      <section
        aria-labelledby="card-heading"
        className="rounded-[var(--radius-a11y-card)] border-2 border-a11y-text/10 bg-a11y-bg-alt p-6 shadow-sm"
      >
        <h2 id="card-heading" className="mb-4 text-[var(--text-a11y-lg)] font-bold">
          추천 쉼터 1곳
        </h2>

        {loading && (
          <p className="text-a11y-text-muted" role="status">
            불러오는 중...
          </p>
        )}

        {!loading && !recommendation && !coords && (
          <p className="text-a11y-text-muted">
            위의 <strong className="text-a11y-info">📍 내 위치로 찾기</strong> 버튼을
            먼저 눌러주세요.
          </p>
        )}

        {!loading && !recommendation && coords && (
          <p className="text-a11y-text-muted">
            근처에서 추천할 쉼터를 찾지 못했어요.
          </p>
        )}

        {recommendation && (
          <article className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[var(--text-a11y-xl)] font-bold">
                {recommendation.aircon ? "🟢 " : "🟠 "}
                {recommendation.name}
              </h3>
              <span className="whitespace-nowrap rounded-full bg-a11y-ok px-3 py-1 text-[var(--text-a11y-sm)] font-semibold text-white">
                {recommendation.type}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[var(--text-a11y-base)]">
              <dt className="font-semibold">주소</dt>
              <dd>{recommendation.address}</dd>
              <dt className="font-semibold">운영</dt>
              <dd>{recommendation.operatingHours}</dd>
              <dt className="font-semibold">정원</dt>
              <dd>{recommendation.capacity}명</dd>
              <dt className="font-semibold">에어컨</dt>
              <dd>{recommendation.aircon ? "🟢 있음" : "🟠 없음"}</dd>
              <dt className="font-semibold">휠체어</dt>
              <dd>{recommendation.accessible ? "✅ 가능" : "⚠️ 확인 필요"}</dd>
            </dl>
            {recommendation.phone && (
              <a
                href={`tel:${recommendation.phone}`}
                className="min-h-touch mt-2 inline-flex items-center justify-center rounded-[var(--radius-a11y-btn)] bg-a11y-ok px-5 py-3 text-[var(--text-a11y-lg)] font-bold text-white hover:brightness-110"
                aria-label={`${recommendation.name} 전화하기`}
              >
                📞 전화 걸기 {recommendation.phone}
              </a>
            )}
          </article>
        )}
      </section>

      <section
        aria-labelledby="weather-heading"
        className="rounded-[var(--radius-a11y-card)] border-2 border-a11y-text/10 p-5"
      >
        <h2
          id="weather-heading"
          className="mb-3 text-[var(--text-a11y-lg)] font-bold"
        >
          오늘 날씨 요약
        </h2>
        <ul className="grid grid-cols-2 gap-3 text-[var(--text-a11y-base)] sm:grid-cols-4">
          <li>
            <span className="block text-a11y-text-muted">기온</span>
            <strong className="text-[var(--text-a11y-xl)]">
              {MOCK_WEATHER.temperature}°C
            </strong>
          </li>
          <li>
            <span className="block text-a11y-text-muted">하늘</span>
            <strong className="text-[var(--text-a11y-xl)]">
              {MOCK_WEATHER.sky}
            </strong>
          </li>
          <li>
            <span className="block text-a11y-text-muted">미세먼지(㎍/㎥)</span>
            <strong className="text-[var(--text-a11y-xl)]">
              {MOCK_WEATHER.pm10}
            </strong>
          </li>
          <li>
            <span className="block text-a11y-text-muted">폭염지수</span>
            <strong className="text-[var(--text-a11y-xl)]">
              {MOCK_WEATHER.heatIndex}
            </strong>
          </li>
        </ul>
        <p className="mt-3 text-[var(--text-a11y-sm)] text-a11y-text-muted">
          ※ 기상 API 연동 전 모의 데이터입니다.
        </p>
      </section>

      <nav
        aria-label="주요 화면 이동"
        className="mt-2 flex flex-col gap-3 sm:flex-row"
      >
        <Link
          href="/shelters"
          className="min-h-touch-lg flex-1 rounded-[var(--radius-a11y-btn)] bg-a11y-ok px-6 py-4 text-center text-[var(--text-a11y-lg)] font-bold text-white hover:brightness-110"
        >
          🗺️ 주변 쉼터 지도 보기
        </Link>
      </nav>

      <footer className="mt-auto text-[var(--text-a11y-sm)] text-a11y-text-muted">
        <p>
          데이터 모드:{" "}
          <strong>{mode === "live" ? "실데이터" : "모의(Mock)"}</strong>{" "}
          · 출처: 공공데이터포털 무더위/한파쉼터 (스키마 재현)
        </p>
      </footer>
    </main>
  );
}
