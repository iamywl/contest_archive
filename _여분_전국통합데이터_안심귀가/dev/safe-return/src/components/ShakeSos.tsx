"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 흔들기 감지 + 3초 카운트다운 SOS 버튼.
 *
 * - DeviceMotionEvent 의 가속도 크기가 임계값(25 m/s²)을 2회 이상 짧은 창 안에
 *   감지되면 카운트다운 시작. iOS 13+ 는 `DeviceMotionEvent.requestPermission()`
 *   수동 호출 필요 (사용자 제스처 → "흔들기 감지 켜기" 버튼 클릭 시 승인).
 * - 카운트다운 3초 안에 "해제" 누르면 취소. 아니면 `tel:112` 딥링크.
 * - 제안서 §5.3 리스크: 흔들기 단독 트리거로 즉시 112 금지 → 카운트다운 필수.
 */

type MotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const SHAKE_THRESHOLD = 25;
const SHAKE_WINDOW_MS = 500;
const COUNTDOWN_SECONDS = 3;

export function ShakeSos() {
  const [permission, setPermission] = useState<"idle" | "granted" | "denied">(
    "idle",
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastTriggerAt, setLastTriggerAt] = useState<number | null>(null);
  const motionHistory = useRef<number[]>([]);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
  }, []);

  const triggerSos = useCallback(() => {
    if (countdown !== null) return;
    setCountdown(COUNTDOWN_SECONDS);
    setLastTriggerAt(Date.now());
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
            countdownTimer.current = null;
          }
          // 실제 연결은 tel:112 딥링크만. 112 REST 호출 금지 (자치경찰 API 미승인).
          if (typeof window !== "undefined") {
            window.location.href = "tel:112";
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdown]);

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
      const magnitude = Math.sqrt(
        (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2,
      );
      const now = Date.now();
      if (magnitude > SHAKE_THRESHOLD) {
        motionHistory.current.push(now);
        motionHistory.current = motionHistory.current.filter(
          (t) => now - t <= SHAKE_WINDOW_MS,
        );
        if (motionHistory.current.length >= 2) {
          motionHistory.current = [];
          triggerSos();
        }
      }
    },
    [triggerSos],
  );

  useEffect(() => {
    if (permission !== "granted") return;
    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [permission, handleMotion]);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  const requestMotionPermission = useCallback(async () => {
    const MotionEvent = (typeof DeviceMotionEvent !== "undefined"
      ? DeviceMotionEvent
      : undefined) as MotionEventWithPermission | undefined;
    if (!MotionEvent) {
      setPermission("denied");
      return;
    }
    if (typeof MotionEvent.requestPermission === "function") {
      try {
        const result = await MotionEvent.requestPermission();
        setPermission(result === "granted" ? "granted" : "denied");
      } catch {
        setPermission("denied");
      }
    } else {
      // Android·Desktop: 권한 승인 없이 즉시 구독 가능
      setPermission("granted");
    }
  }, []);

  return (
    <section
      aria-label="긴급 SOS"
      className="rounded-2xl border border-[var(--bad)]/40 bg-[var(--card)] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">긴급 SOS</h2>
          <p className="text-sm text-[var(--muted)]">
            흔들기 2회 → 3초 카운트다운 → 112 딥링크. 해제 버튼으로 오탐 취소.
          </p>
        </div>
        {permission !== "granted" ? (
          <button
            type="button"
            onClick={requestMotionPermission}
            className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
          >
            {permission === "denied" ? "감지 불가" : "흔들기 감지 켜기"}
          </button>
        ) : (
          <span className="shrink-0 rounded-xl bg-[var(--ok)]/20 px-3 py-2 text-xs text-[var(--ok)]">
            감지 ON
          </span>
        )}
      </div>

      <div className="mt-4">
        {countdown === null ? (
          <button
            type="button"
            onClick={triggerSos}
            className="w-full rounded-xl bg-[var(--bad)] py-4 text-lg font-bold text-white shadow active:scale-[0.99]"
          >
            SOS — 3초 후 112 연결
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--bad)] bg-[var(--bad)]/10 p-4">
            <span className="text-3xl font-black tabular-nums text-[var(--bad)]">
              {countdown}
            </span>
            <div className="flex-1">
              <p className="font-semibold">카운트다운 중 — 112 자동 연결</p>
              <p className="text-xs text-[var(--muted)]">
                오탐이면 즉시 해제하세요
              </p>
            </div>
            <button
              type="button"
              onClick={cancelCountdown}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold"
            >
              해제
            </button>
          </div>
        )}
      </div>

      {lastTriggerAt && countdown === null && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          마지막 감지: {new Date(lastTriggerAt).toLocaleTimeString("ko-KR")}
        </p>
      )}
    </section>
  );
}
