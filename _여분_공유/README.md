# 여분 프로젝트 공용 리소스

10개 여분 프로젝트(`_여분_*/`)가 공통으로 재사용하는 리소스 모음.
**읽기 전용** — 각 프로젝트 에이전트가 참조할 뿐 수정하지 않는다.

---

## 디렉터리

```
_여분_공유/
├── README.md                       ← 이 문서
├── lib/
│   ├── public-api-proxy.ts         ← TS: 5분 TTL + SWR 캐시 + mock 폴백
│   ├── local-llm.ts                ← TS: Ollama HTTP 클라이언트 (Next.js)
│   ├── local_llm.py                ← Py: Ollama HTTP 클라이언트 (Streamlit)
│   ├── local_stt.py                ← Py: whisper.cpp / MLX Whisper 래퍼
│   └── local_tts.py                ← Py: Kokoro / XTTS 래퍼
├── components/
│   └── Map.tsx                     ← Leaflet + OSM 지도 컴포넌트
├── tailwind-a11y.config.ts         ← WCAG 2.2 AAA 디자인 토큰
├── scripts/
│   └── capture.mjs                 ← Playwright 스크린샷 자동화
├── templates/
│   ├── CLAUDE.md                   ← 폴더별 작업 지침 템플릿
│   └── 개발계획서.md                 ← 개발계획서 7섹션 템플릿
└── mock-fixtures/                  ← 공공 API Mock 응답 샘플
    ├── README.md
    └── *.json
```

---

## 스택 준수 원칙

- **API 기반 AI 금지** — `anthropic`, `openai`, `@anthropic-ai/sdk` 등 의존성 추가 불가.
- **로컬 LLM 전용** — Ollama(`devstral-2:123b`, `llama3.3:70b`, `qwen2.5:32b`, `gemma3:27b`, `qwen2.5:7b`), MLX, llama.cpp 등.
- **로컬 STT/TTS** — whisper.cpp / MLX Whisper / Kokoro / Coqui XTTS.
- **Mock 폴백 필수** — 공공 API 키가 없어도 시연이 가능해야 한다.
- 근거: 저장소 루트 [`CLAUDE.md`](../CLAUDE.md) §7.

---

## 참조 방식

### Next.js 프로젝트 (전국통합데이터 5개)

```ts
// dev/<project>/src/lib/llm.ts
import { chat } from '../../../../_여분_공유/lib/local-llm';
// 또는 tsconfig paths로 alias (`@shared/*`)
```

### Streamlit 프로젝트 (현대오토에버 5개)

```python
# src/ai-pipeline/app.py
import sys
sys.path.insert(0, str(Path(__file__).parent / '..' / '..' / '..' / '_여분_공유' / 'lib'))
from local_llm import LocalLLM
from local_stt import LocalSTT
```

각 프로젝트는 설치 시 이 디렉터리의 파일을 **복사가 아닌 참조**해야 한다 (단일 진실 출처).

---

## 기준 머신

MacBook Pro M4 Max · 128GB · macOS 15.7.4. 로컬 대형 모델 단독/제한된 동시 구동 가능.
상세: [CLAUDE.md §7.3](../CLAUDE.md).

---

*`_여분_공유/README.md` · v1 · 2026-04-22*
