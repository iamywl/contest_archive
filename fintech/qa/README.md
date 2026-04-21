# QA / 검증 기록

FIN:NECT 챌린지 2026 MVP의 개발 품질 검증 기록을 보관합니다.

## 📄 문서

| 파일 | 내용 |
|---|---|
| [REPORT.md](REPORT.md) | **1차 UI 리뷰** — Playwright 자동 스크린샷 22장 기반, 결함 3건 발견·수정 (`devIndicators`, 빈 집중도 도넛, 파이 라벨) |
| [CODE_REVIEW.md](CODE_REVIEW.md) | **2차 정밀 코드 리뷰** — 수학·상태관리·엣지케이스 검증, 결함 9건 발견·수정 (DCA FX 누락, 감사로그 폭증, 데드코드 등) |
| [README_VALIDATION.md](README_VALIDATION.md) | **3차 README 검증** — 실제 웹사이트 캡처로 README 약속과 실제 구현 일치 확인 |

## 🖼️ shots/

실제 `http://localhost:3000` 에서 Playwright로 캡처된 스크린샷 (별도 이미지 생성 없이 **실제 웹 렌더링 결과**).

재캡처:
```bash
cd ../web
npm run dev &            # 포트 3000 확보
node scripts/capture.mjs # qa/shots/ 갱신
```

## 🔁 검증 이력 요약

| 차수 | 발견 결함 | 수정 | 증빙 |
|---|---|---|---|
| 1차 (UI) | 3건 | 3건 | [REPORT.md](REPORT.md), [shots/](shots/) |
| 2차 (코드) | 9건 | 9건 | [CODE_REVIEW.md](CODE_REVIEW.md) |
| 3차 (README) | — | — | [README_VALIDATION.md](README_VALIDATION.md) |
| **합계** | **12** | **12** | — |
