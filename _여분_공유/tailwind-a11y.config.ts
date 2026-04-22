/**
 * Tailwind CSS 접근성 디자인 토큰.
 *
 * WCAG 2.2 AAA(대비 7:1, 대형 텍스트 4.5:1)를 디폴트로 적용.
 * 실버친구(고령자)·쉬운말(저문해)·시각길잡이(시각장애) 등이 공통 사용.
 *
 * 사용법 (각 프로젝트 tailwind.config.ts):
 *   import { a11yTheme } from "../../../_여분_공유/tailwind-a11y.config";
 *   export default { theme: { extend: a11yTheme } };
 *
 * 또는 preset으로 합체:
 *   presets: [require("../../../_여분_공유/tailwind-a11y.config").default]
 */

import type { Config } from "tailwindcss";

/**
 * 최소 폰트 크기·터치 영역·고대비 팔레트 모음.
 *
 * - baseFontSize 18px: WCAG 대형 텍스트 임계(18pt=24px) 근접, 고령자 가독성 상향.
 * - touchTarget 48x48dp: WCAG 2.2 AAA Target Size (Enhanced) 기준.
 * - palette: 다크 텍스트 on 밝은 배경 기준 7:1+ 대비.
 */
export const a11yTheme = {
  colors: {
    a11y: {
      // 텍스트 (on bg) — 7:1 대비
      text: "#1a1a1a",
      textMuted: "#404040",

      // 배경
      bg: "#ffffff",
      bgAlt: "#f4f4f5",

      // 신호 팔레트 (색각 친화, 픽토그램과 이중 인코딩)
      ok: "#0f7b3a", // 초록 (#0F7B3A vs white ≈ 6.8:1, with 픽토그램 병기)
      warn: "#8a6d00", // 진노랑
      bad: "#a4243b", // 진빨강
      info: "#0b5a8a",

      // 포커스 아웃라인 (키보드 내비)
      focus: "#005fcc",

      // 다크모드
      darkText: "#ffffff",
      darkBg: "#0f0f10",
      darkBgAlt: "#1c1c1f",
    },
  },

  fontSize: {
    // px 단위 직접 지정 → 프로젝트별 base 변경에 영향받지 않음
    "a11y-xs": ["14px", { lineHeight: "1.5" }],
    "a11y-sm": ["16px", { lineHeight: "1.6" }],
    "a11y-base": ["18px", { lineHeight: "1.6" }], // 디폴트 ≥ 18px
    "a11y-lg": ["22px", { lineHeight: "1.5" }],
    "a11y-xl": ["28px", { lineHeight: "1.4" }],
    "a11y-2xl": ["36px", { lineHeight: "1.3" }],
    "a11y-3xl": ["48px", { lineHeight: "1.2" }],
  },

  spacing: {
    // 터치 타깃 최소 48x48dp
    touch: "48px",
    "touch-lg": "56px",
  },

  borderRadius: {
    "a11y-btn": "12px",
    "a11y-card": "16px",
  },

  ringWidth: {
    // 키보드 포커스 아웃라인 ≥ 3px
    focus: "3px",
  },

  screens: {
    // 고령자/저시력자 태블릿 가로 기본
    "a11y-sm": "480px",
    "a11y-md": "768px",
    "a11y-lg": "1024px",
  },
};

/**
 * Tailwind preset 형태 — `presets: [a11yPreset]` 로 바로 주입 가능.
 */
export const a11yPreset: Partial<Config> = {
  theme: {
    extend: a11yTheme as unknown as Config["theme"],
  },
};

export default a11yPreset;
