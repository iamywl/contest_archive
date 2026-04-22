# CLAUDE.md — 모두대화 (Talk For All) 프로젝트 작업 지침

> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 `_여분_공유/templates/CLAUDE.md` 를 상속합니다.
> AAC(보완대체의사소통)·음성·자막·수어를 엮은 범용 의사소통 브릿지 여분 프로젝트.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **모두대화 (Talk For All)** |
| 공모전 | 2026 현대오토에버 배리어프리 앱 개발 콘테스트 |
| 카테고리 | 언어·발달장애 · 의사소통 AAC |
| 타깃 | 언어장애·발달장애·뇌졸중 후 실어증 환자 + 아동 AAC 사용자 |
| 폴더 | `_여분_현대오토에버_모두대화/` |
| 제출 마감 | **2026-05-17 (D-25, 긴급 모드)** |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 디렉터리 구조 (고정)

```
_여분_현대오토에버_모두대화/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (스택 규격, 원칙적 읽기 전용)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트 (S4 작성)
│   └── captures/           ← Streamlit PoC 실 구동 스크린샷 PNG
└── src/
    └── talkforall/         ← Streamlit PoC 구현 코드
        ├── app.py          ← Streamlit 엔트리 (AAC 그리드 + 4채널 출력)
        ├── aac_grid.py     ← ARASAAC 심볼 그리드 UI
        ├── predictor.py    ← LocalLLM 기반 한국어 조사·어미 보정
        ├── tts.py          ← Kokoro TTS (ko) · XTTS-v2 fallback
        ├── ksl.py          ← KSL 30문장 glTF 프리셋 로더
        ├── presets.py      ← 병원·학교·관공서 상황 프리셋
        ├── db.py           ← SQLite (Supabase 로컬 대체)
        └── assets/
            ├── arasaac/    ← ARASAAC 한국어 픽토그램 (CC 라이선스)
            └── ksl/        ← KSL 30문장 glTF 애니메이션
```

- 루트 잡파일 금지. `docs/` 외부 문서 산재 금지, `src/` 외부 코드 산재 금지.
- `docs/captures/` 는 **본 커밋 시점에 선행 생성** (빈 디렉터리 유지용 `.gitkeep` 허용).

---

## 2. 작업 흐름 (매 세션 · D-25 긴급 모드)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, API 기반 AI 금지)
2. 본 문서 + 제안서.md §6·§8 재확인 (제안서가 기술 스택 규격)
3. TodoWrite 로 작업 계획 (스프린트 단위)
4. 코드/문서 변경
5. 실제 구동 → 캡처 (Streamlit 화면 수동 캡처, macOS Cmd+Shift+4)
6. 캡처 검토 → 의도와 다르면 수정·재구동·재캡처
7. 개발계획서 §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
8. 개발보고서 해당 섹션 갱신
9. 요소기능 단위 커밋 (기획·AAC 그리드·예측·TTS·KSL·프리셋 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

저장소 루트 CLAUDE.md §7 의 금지·허용 목록을 그대로 상속.

| 용도 | 구현 | 근거 |
|---|---|---|
| LLM 추론 | Ollama `aac` → **`gemma3:27b-instruct-q4_K_M`** | 한국어 조사·어미 보정, 27B Q4 ≈ 18GB RAM |
| LLM 폴백 | Ollama `qwen2.5:32b-instruct-q4_K_M` | 한국어 장문 처리 백업 |
| 구조화 출력 | `outlines` 또는 `llama.cpp grammar` | 심볼 시퀀스 → 문장 스키마 강제 |
| TTS | **Kokoro TTS (한국어)** | 로컬 합성, 오프라인 |
| TTS 폴백 | **Coqui XTTS-v2** | 화자 복제·다국어 확장 |
| KSL 수어 | glTF 30문장 프리셋 (병원·관공서) | 국립국어원 한국수어사전 참고 |
| 심볼셋 | **ARASAAC 한국어 (CC 라이선스)** 로컬 번들 | 오프라인, 라이선스 명기 |
| DB | **SQLite** (Supabase 로컬 대체) | 공동 편집 메타·사용 로그 |

**금지**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Clova Voice API, Google TTS API 등 외부 AI/음성 API 클라이언트 일체.

### 3.1 Ollama alias 설정 예시

```bash
# 모델 풀링
ollama pull gemma3:27b-instruct-q4_K_M

# alias (Modelfile 또는 환경변수)
export TALKFORALL_LLM=gemma3:27b-instruct-q4_K_M
```

코드에서는 `_여분_공유/lib/local_llm.py` 의 `LocalLLM(alias="aac")` 로 호출.

---

## 4. 공용 리소스 참조

모두 `_여분_공유/` 를 **참조**(복사 금지):

- LLM 래퍼: `_여분_공유/lib/local_llm.py`
- TTS 래퍼: `_여분_공유/lib/local_tts.py`
- a11y 토큰: Streamlit 커스텀 CSS 로 대응 (고대비·큰 글씨)
- Mock fixture: `_여분_공유/mock-fixtures/` (ARASAAC 샘플 메타 일부)

---

## 5. 빌드·구동

### Streamlit PoC

```bash
cd src/talkforall
uv sync                 # 또는 pip install -e .
ollama serve &          # 백그라운드
ollama pull gemma3:27b-instruct-q4_K_M  # 최초 1회
streamlit run app.py
```

**구동 → 캡처 → 검토** 의 순환이 필수. 캡처는 `docs/captures/` 아래 PNG.

### 오프라인 시연 대비

- ARASAAC 심볼은 **로컬 번들**. 네트워크 차단 환경에서도 그리드 표시 가능해야 함.
- KSL 30문장 glTF 는 `src/talkforall/assets/ksl/` 에 사전 동봉.
- LLM·TTS 모두 로컬 → 심사 환경 네트워크 차단 시에도 시연 가능.

---

## 6. 핵심 기능 우선순위 (제안서 §6)

1. **기능 1 · AAC 심볼 그리드** (ARASAAC 한국어) — 스프린트 2 필수 산출물
2. **기능 2 · 한국어 예측 문장 (LocalLLM)** — 스프린트 3 핵심
3. **기능 3 · 4채널 동시 출력** (음성·자막·심볼·KSL) — 스프린트 3 차별점
4. **기능 4 · 상황 프리셋** (병원·학교·관공서 30종) — 스프린트 3
5. **기능 5 · 보호자·치료사 공동 편집** — 스프린트 4 (SQLite 기반 간소화)

D-25 긴급 모드에서 **1~3을 최우선 확보**, 4~5 는 요약·프리셋 3종·편집 1건 시연으로 축소 가능.

---

## 7. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] `streamlit run app.py` 1회 이상 성공 기동
- [ ] Mock 모드(LLM·TTS 미탑재 환경)에서도 심볼 그리드 · 프리셋 UI 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+ (`docs/captures/`)
- [ ] 개발보고서 검토 체크리스트 7항목 ✅
- [ ] 커밋에 `Co-Authored-By: Claude` 트레일러 **0건**
- [ ] 제안서 §12 근거자료 각주 전부 유효 링크

---

## 8. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova Voice 등)
- ❌ 아동 발화 로그의 외부 서버 전송
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ Mock 폴백 부재 (LLM·TTS 미탑재 시에도 최소 UI 시연 가능해야 함)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ `Co-Authored-By: Claude` 커밋 트레일러
- ❌ ARASAAC 라이선스(CC) 표기 누락

---

*`_여분_현대오토에버_모두대화/CLAUDE.md` · v1 · last_updated 2026-04-22*
