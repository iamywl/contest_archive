# 청년원스톱 (Youth One-Stop)

> 19~39세 청년이 **한 번 조건 입력** 으로 온통청년·고용24·LH·HRD-Net·서민금융진흥원 5개
> 기관의 정책을 동시 매칭받는 Next.js PoC.
> 모든 추론은 로컬 Ollama 사용, 실패 시 규칙/템플릿 폴백 (루트 CLAUDE.md §7).

## 실행

```bash
pnpm install
pnpm build           # 필수
pnpm dev             # http://localhost:3000

# 로컬 LLM (옵션)
ollama pull qwen2.5:32b-instruct-q4_K_M
ollama serve &
```

## 화면

| # | 경로 | 기능 |
|:--:|---|---|
| ① | `/` | 내 매칭 · 프로파일 → Top 20 |
| ② | `/policies` | 카테고리별 정책 탐색 |
| ③ | `/jobs` | 일자리 · 훈련 탭 전환 |
| ④ | `/draft` | 로컬 LLM/템플릿 신청서 초안 |
| ⑤ | `/calendar` | 60일 이내 마감 캘린더 |

## API

| 경로 | 설명 |
|---|---|
| `GET /api/policies` | 5기관 통합 목록 (mock) |
| `GET /api/jobs` | 고용24·HRD-Net 목록 (mock) |
| `POST /api/matches` | 규칙 기반 매칭 점수 |
| `POST /api/draft` | Ollama 초안 → 실패 시 템플릿 폴백 |

## 개인정보 원칙

- 소득·주민번호 원값 수집 금지. 프로파일은 **범주형**(소득 구간 3단계, 주거/고용 enum)만 저장.
- 입력 값은 `localStorage.youth-profile` 에만 저장되고 서버에는 요청 시점에만 전송된다.
- 신청서 초안은 본인 범주 정보만 사용해 생성하며, 민감정보는 텍스트 패턴으로도 만들지 않는다.

## 제약

- 공공 API 실연동은 공공데이터포털 키 확보 후 `_여분_공유/lib/public-api-proxy.ts` 로 교체.
- Ollama 미가동 시 `/api/draft` 는 템플릿 기반 응답. UI 흐름 유지가 목적.
