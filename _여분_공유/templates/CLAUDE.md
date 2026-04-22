# CLAUDE.md — {{PROJECT_NAME}} 프로젝트 작업 지침

> 이 파일은 `_여분_공유/templates/CLAUDE.md` 를 복사한 템플릿입니다.
> `{{PROJECT_NAME}}`·`{{CONTEST_NAME}}`·`{{TARGET}}` 같은 플레이스홀더를 실제 값으로 치환하세요.
> 저장소 루트 [`../CLAUDE.md`](../../CLAUDE.md) 와 공모전 `CLAUDE.md` 를 상속합니다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **{{PROJECT_NAME}}** |
| 공모전 | {{CONTEST_NAME}} |
| 카테고리 | {{CATEGORY}} |
| 타깃 | {{TARGET}} |
| 폴더 | `_여분_{{CONTEST_SLUG}}_{{PROJECT_SLUG}}/` |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 디렉터리 구조 (고정)

```
_여분_{{CONTEST_SLUG}}_{{PROJECT_SLUG}}/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (읽기 전용, 스택 규격)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트
│   └── {{CAPTURES_DIR}}/   ← screenshots/ (Next.js) 또는 captures/ (Streamlit)
└── {{CODE_DIR}}/           ← dev/{{SLUG}}/ (Next.js) 또는 src/{{SLUG}}/ (Streamlit)
```

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, API 기반 AI 금지)
2. 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
3. TodoWrite 로 작업 계획
4. 코드/문서 변경
5. 실제 구동 → 캡처 (capture.mjs 또는 수동)
6. 캡처 검토 → 의도와 다르면 수정·재캡처
7. 개발계획서 §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
8. 개발보고서 해당 섹션 갱신
9. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

| 용도 | 권장 구현 | 참조 |
|---|---|---|
| LLM 추론 | Ollama (`{{LLM_ALIAS}}` → {{LLM_MODEL}}) | `_여분_공유/lib/local_llm.py` / `local-llm.ts` |
| 구조화 출력 | `outlines` 또는 `llama.cpp grammar` | - |
| STT | whisper.cpp / MLX Whisper | `_여분_공유/lib/local_stt.py` |
| TTS | Kokoro / Coqui XTTS | `_여분_공유/lib/local_tts.py` |
| 임베딩 | Ollama `nomic-embed-text` | LocalLLM.embed() |
| 벡터 DB | FAISS (로컬) 또는 pgvector | - |
| 비전 | Ultralytics YOLO (ONNX) · MediaPipe · PaddleOCR | - |

**금지**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Cohere SDK 등 외부 AI API 클라이언트 일체.

---

## 4. 공용 리소스 참조

모두 `_여분_공유/` 의 파일을 **참조**(복사 금지):

- 공공 API 프록시: `_여분_공유/lib/public-api-proxy.ts`
- 지도: `_여분_공유/components/Map.tsx`
- a11y 토큰: `_여분_공유/tailwind-a11y.config.ts`
- 캡처: `node _여분_공유/scripts/capture.mjs <baseUrl> <outDir>`
- Mock fixture: `_여분_공유/mock-fixtures/<api>.json`

---

## 5. 빌드·구동

### Next.js (전국통합데이터)
```bash
cd dev/{{SLUG}}
pnpm install
pnpm build   # 성공 필수
pnpm dev     # 개발 서버
```

### Streamlit (현대오토에버)
```bash
cd src/{{SLUG}}
uv sync      # 또는 pip install -e .
streamlit run app.py
```

구동 → 캡처 → 검토의 순환이 **필수**.

---

## 6. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] 빌드 1회 이상 성공
- [ ] Mock 모드로 API 키 없이 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+
- [ ] 개발보고서 체크리스트 7항목 ✅
- [ ] 커밋에 Co-Authored-By: Claude 트레일러 0건

---

## 7. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova 등)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ mock 폴백 부재 (인증키 없을 때 동작 실패)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ Co-Authored-By: Claude 커밋 트레일러

---

*`_여분_공유/templates/CLAUDE.md` · v1 · 2026-04-22*
