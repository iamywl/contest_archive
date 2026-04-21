# FIN:NECT 챌린지 2026 — RiskScope

> **시나리오 기반 개인화 금융상품 추천 서비스** · 한국핀테크지원센터 + 카카오뱅크 공동 주최 챌린지 출품 작업공간

제안서 · 리서치 · MVP 프로토타입 · QA 검증 기록을 한곳에서 관리합니다.

---

## 📁 디렉토리 구성

```
fintech/
├── README.md                ← 본 문서 (작업공간 안내)
├── CLAUDE.md                ← AI 보조를 위한 작업 원칙 (논문 스타일 · research 폴더 등)
├── 2026_공고문.pdf          ← 챌린지 공식 공고문 (9페이지)
├── proposal.md              ← 신청서 초안 (5개 항목, 팀 항목은 보류)
│
├── research/                ← 제안서 근거 자료 (31+ 인용, APA 7th)
│   ├── README.md            ← 폴더 사용 규칙
│   ├── references.md        ← 마스터 인용 인덱스
│   ├── problems_overview.md ← 문제·해법·공백 종합 리뷰
│   ├── papers/              ← 학술 논문 요약 (7건)
│   ├── services/            ← 상용 서비스 분석 (13건)
│   ├── regulations/         ← 규제·정책 (7건)
│   └── data/                ← 시장 통계 (11건)
│
├── web/                     ← Next.js MVP (RiskScope 프로토타입)
│   ├── app/                 ← 라우트 15개 + API 1개
│   ├── components/          ← UI 컴포넌트
│   ├── lib/                 ← 시뮬레이션·추천·비용·NLP·감사 로직
│   └── scripts/capture.mjs  ← Playwright 자동 스크린샷 스크립트
│
└── qa/                      ← 검증 기록
    ├── REPORT.md            ← 1차 UI 기반 QA 리포트
    ├── CODE_REVIEW.md       ← 2차 소스 기반 정밀 코드 리뷰
    └── shots/               ← 실제 웹에서 캡처된 검증용 스크린샷
```

---

## 🧭 당신이 여기 처음 왔다면

### 1. 제안서를 읽으려면
- [proposal.md](proposal.md) — FIN:NECT 챌린지 2026 신청서 초안 (5개 항목)
- [CLAUDE.md](CLAUDE.md) — 작업 원칙 (논문 스타일·상용 서비스 기반·research 폴더 인용)
- [2026_공고문.pdf](2026_공고문.pdf) — 공식 공고문

### 2. 근거 리서치를 탐색하려면
- [research/problems_overview.md](research/problems_overview.md) — 문제점 카탈로그·기존 해법·미해결 공백 종합
- [research/references.md](research/references.md) — 전체 인용 목록 (P01-P07 · S01-S13 · R01-R07 · D01-D11)
- [research/services/](research/services/) — 토스증권·카카오뱅크·Betterment·Wealthfront 등 13개 벤치마크
- [research/papers/](research/papers/) — Capponi·Boreiko·Gambacorta 등 7편 논문 요약
- [research/regulations/](research/regulations/) — 금소법·마이데이터 2.0·홍콩 ELS 사태·SEC Reg BI 등
- [research/data/](research/data/) — 불완전판매·서학개미·Mag7 집중·금융이해력 등 시장 통계

### 3. MVP를 실행해 보려면
```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```
상세는 [web/README.md](web/README.md).

### 4. QA·검증 기록을 보려면
- [qa/REPORT.md](qa/REPORT.md) — 1차 UI 리뷰 (Playwright 22 스크린샷 기반, 결함 3건 수정)
- [qa/CODE_REVIEW.md](qa/CODE_REVIEW.md) — 2차 정밀 코드 리뷰 (수치·상태·엣지케이스, 결함 9건 수정)
- [qa/shots/](qa/shots/) — 실제 웹사이트에서 캡처한 증빙 스크린샷 22장

---

## 🎯 프로젝트 한눈에

**타깃 문제**: 한국 리테일 금융시장에서 "추천된 상품이 실제 리스크 시나리오 하에서 어떻게 움직이는지"를 사전 분포로 확인할 수단이 없다. 반복되는 대형 불완전판매([R05] 2024 홍콩 ELS 4.6조 원 손실), 서학개미 비헤지 매수([D04]), Mag7 집중([D08]), 금융이해력 하락([D01])이 이 공백에서 비롯된다.

**우리 해법**: 사용자 프로필 기반 **개인화 추천 엔진** + 추천 상품의 **복합 거시 리스크 시나리오 몬테카를로 시뮬레이션** + **리스크 요인별 기여도(XAI)** + **원화 실질 수익률 변환** + **불완전판매 사전방지 체크** 를 하나의 리테일 UI에 결합.

**차별화 4축**:
1. 추천 ↔ 시나리오 결합 (국내 MTS·로보어드바이저 모두 부재)
2. 원화 실질 수익률 (환율·인플레·세금 반영)
3. 이해관계자별 XAI (고객용·내부 이중 레이어)
4. 불완전판매 사전방지 (최악 시나리오 의무 고지)

---

## ✅ 현재 상태 (2026-04-21)

- **제안서 초안** 완료 (팀 항목 보류)
- **리서치** 31+ 인용 · 4섹션 종합 리뷰 완료
- **MVP 웹앱** 15개 페이지 + 1 API, 타입체크·프로덕션 빌드 통과
- **QA** 1차 + 2차 리뷰 완료, 결함 총 12건 수정
- **제출 마감** 2026-05-25 23:59

---

## 📅 공고 일정

| 단계 | 기간 |
|---|---|
| 접수 | ~ 2026-05-25 |
| 서류심사 발표 | 2026-06-05 |
| 아이디어 고도화 ① | 2026-06-15 ~ 06-30 |
| 지역예선 | 2026-06-30 ~ 07-10 |
| 아이디어 고도화 ② | 2026-07-20 ~ 08-21 |
| 통합본선 | 2026-08-24 ~ 08-28 |
| 해외 프로그램 (우수 6팀) | Tech Crunch Disrupt 2026, 10-13 ~ 10-18 |

---

## 🔗 외부 링크
- 접수: https://donation.fintech.or.kr/main
- 문의: 02-6203-2206 / finnect_challenge@likelion.net
