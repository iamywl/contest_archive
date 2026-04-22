# CLAUDE.md — 시각길잡이 (Sight Guide) 프로젝트 작업 지침

> 본 문서는 `_여분_공유/templates/CLAUDE.md` 를 바탕으로 시각길잡이(Sight Guide) 프로젝트용으로 치환되었습니다.
> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 공모전 [`../현대오토에버_배리어프리/CLAUDE.md`](../현대오토에버_배리어프리/CLAUDE.md) 를 상속합니다.
> 매 세션 시작 시 **루트 CLAUDE.md → 공모전 CLAUDE.md → 본 문서** 순으로 읽고 규칙을 적용합니다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **시각길잡이 (Sight Guide)** |
| 공모전 | 2026 현대오토에버 배리어프리 앱 개발 콘테스트 |
| 제출 마감 | **2026-05-17 (D-25)** |
| 카테고리 | 시각장애 · 이동·안전 접근성 |
| 타깃 | 등록 시각장애인 약 25만 명 + 고령 저시력자 + 안내견 사용자 |
| 폴더 | `_여분_현대오토에버_시각길잡이/` |
| 기준 머신 | MacBook Pro M4 Max · 128GB 통합 메모리 (저장소 루트 CLAUDE.md §7.3) |
| 핵심 차별점 | 음성-only UX · 지하철 실내 BLE 맵 프리로드 · 온디바이스 실시간 객체 인식 |

---

## 1. 디렉터리 구조 (고정)

```
_여분_현대오토에버_시각길잡이/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (기술 스택 규격, 읽기 전용)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트 (Sprint S4+)
│   └── captures/           ← Streamlit PoC · Flutter Phase2 스크린샷 PNG
└── src/                    ← src/sight-guide/ — PoC 코드 (Streamlit → Flutter)
    └── sight-guide/
```

- 루트에 잡파일 금지. 모든 문서는 `docs/`, 모든 코드는 `src/sight-guide/` 내부.
- 캡처는 반드시 `docs/captures/` 에 PNG로 저장, 보고서에서 상대 경로로 임베드.

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM·로컬 ML 전용, 클라우드 API 금지)
2. 공모전 CLAUDE.md 재확인 (배리어프리 공통 원칙)
3. 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
4. TodoWrite 로 작업 계획
5. 코드/문서 변경
6. 실제 구동 → 캡처 (Streamlit 웹 또는 Flutter 디바이스)
7. 캡처 검토 → 의도와 다르면 수정·재캡처
8. docs/개발계획서.md §5 현재 상황 갱신 (last_updated: YYYY-MM-DD HH:MM)
9. docs/개발보고서.md 해당 섹션 갱신
10. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI·ML 스택 (로컬 전용)

시각길잡이의 주력은 **YOLO 비전 + whisper.cpp STT + Kokoro TTS** 이며,
LLM 은 **음성 명령 자연어 파싱 보조** 용도로만 사용한다.

| 용도 | 권장 구현 | 비고 |
|---|---|---|
| 실시간 객체 인식 | **Ultralytics YOLO v8n** (ONNX/CoreML) | 점자블록·횡단보도·계단·문·기둥·자전거 — 온디바이스 |
| 횡단보도 잔여시간 OCR | PaddleOCR / Apple Vision | 숫자·한글 검출, 온디바이스 |
| STT (한국어) | **whisper.cpp (small/medium)** 또는 MLX Whisper | 음성 명령 기동, 네트워크 불필요 |
| TTS (한국어) | **Kokoro TTS** (fallback Coqui XTTS-v2) | 자연스러운 한국어, 오프라인, 저지연 |
| LLM (보조) | Ollama `small` → **qwen2.5:7b** | 경량 명령 해석 전용 (예: "강남역 2번 출구") |
| 구조화 출력 | `outlines` 또는 `llama.cpp grammar` | 의도 슬롯 JSON 강제 |
| 실내 측위 | BLE 비콘 + IMU 가속도·자이로 Kalman 융합 | 서울 지하철·공항·공공청사 |
| 임베딩 (선택) | Ollama `nomic-embed-text` | POI 검색 보조 |
| 벡터 DB (선택) | FAISS 로컬 | POI·BF 시설 |

**주력은 비전·음성 파이프라인**이고 LLM은 의도 파싱 백업이다.
모든 추론은 **오프라인** 에서 동작해야 심사 환경에서 네트워크 차단 시에도 시연 가능.

**금지**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Clova Voice, Google TTS
등 외부 AI API 클라이언트·클라우드 TTS 일체.

---

## 4. 공용 리소스 참조

모두 `_여분_공유/` 의 파일을 **참조**(복사 금지):

- 로컬 LLM 래퍼: `_여분_공유/lib/local_llm.py` (Ollama qwen2.5:7b 로드)
- 로컬 STT 래퍼: `_여분_공유/lib/local_stt.py` (whisper.cpp)
- 로컬 TTS 래퍼: `_여분_공유/lib/local_tts.py` (Kokoro 한국어)
- 공공 API 프록시: `_여분_공유/lib/public-api-proxy.ts` (BF 인증시설·지하철 POI 호출)
- a11y 토큰: `_여분_공유/tailwind-a11y.config.ts`
- 캡처 스크립트: `node _여분_공유/scripts/capture.mjs <baseUrl> <outDir>`
- Mock fixture: `_여분_공유/mock-fixtures/bf-facility.json`, `subway-poi.json`

---

## 5. 빌드·구동

### Phase 1 — Streamlit PoC (D-25 긴급 모드, 심사 데모 우선)

```bash
cd src/sight-guide
uv sync              # 또는 pip install -e .
ollama serve &       # 백그라운드 (qwen2.5:7b pull 선행)
streamlit run app.py # 웹 데모 + 캡처 대상
```

- 카메라 업로드 → YOLO 추론 → TTS 음성 재생 → BLE 시뮬레이션 맵.
- API 키 없이 **Mock 모드** 로 시연 가능해야 한다.

### Phase 2 — Flutter 빌드 (시간 여유 시)

```bash
cd src/sight-guide/flutter
flutter pub get
flutter run -d ios      # 또는 -d android
```

- Phase 2 는 Flutter 3.x + CoreML/TFLite YOLO.
- D-25 마감 전 Phase 2 완성 불가 시 **Streamlit PoC + 아키텍처 다이어그램 + 시연 영상** 으로 제출.

구동 → 캡처 → 검토의 순환은 **필수**. 캡처 없이 "완료" 보고 금지.

---

## 6. 우선순위 — Killer Feature First

제안서 §6 기준 5 기능 구현 우선순위:

1. ⭐ **실외 도보 보조 (YOLO 객체 인식)** — Streamlit PoC 에서 카메라 업로드 → 점자블록·횡단보도 감지 + TTS.
2. **음성 only UX** — whisper.cpp STT 기동 + Kokoro TTS 응답, 화면 탭 0 시나리오.
3. **실내 BLE 내비게이션** — 서울 지하철 환승 역 1곳 실내 맵 시뮬레이션.
4. **긴급·보호자 모드** — 음성 SOS → SMS·위치 공유 mock.
5. **프라이버시 온디바이스** — 영상 저장 기본 OFF, 로컬 처리 표기.

각 기능은 **자체 데모로 구동** 가능해야 하며, 캡처 1장 이상 필수.

---

## 7. D-25 긴급 마감 모드 운영 원칙

제출 마감 2026-05-17 기준 **25 일** 이내 완성이 목표이므로:

- **Streamlit PoC 완성 > Flutter 완성**. Flutter 는 시간 여유 시에만.
- 기능 1 (YOLO) · 기능 2 (음성 UX) · 기능 5 (프라이버시) 를 최소 완주 세트로 고정.
- 모든 캡처는 **실제 구동 화면** 이어야 함. 목업·합성 이미지 금지.
- 매 3일마다 `docs/개발계획서.md §5` 갱신.
- 2026-05-14 까지 제출 패키지 동결, 이후 3일은 예비일.

---

## 8. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] Streamlit PoC 빌드 1회 이상 성공
- [ ] Mock 모드로 네트워크 차단·API 키 없이 시연 가능
- [ ] 실제 구동 캡처 PNG 5장 이상 (`docs/captures/`)
- [ ] 개발보고서 검토 체크리스트 7항목 전부 ✅
- [ ] 시연 영상 1편 (백업용, 심사 환경 네트워크 차단 대비)
- [ ] 커밋에 `Co-Authored-By: Claude` 트레일러 0건

---

## 9. 절대 금지

- ❌ 클라우드 AI·TTS API (Claude / OpenAI / Gemini / Clova Voice / Google TTS 등)
- ❌ API 키 하드코딩
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ mock 폴백 부재 (키·네트워크 없을 때 데모 실패)
- ❌ 출처 없는 통계 인용 (제안서·보고서 공통)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격; 다르면 제안서 먼저 수정)
- ❌ `Co-Authored-By: Claude` 커밋 트레일러
- ❌ `docs/` 외부에 문서 산재, `src/sight-guide/` 외부에 코드 산재

---

*`_여분_현대오토에버_시각길잡이/CLAUDE.md` · v1 · 2026-04-22*
