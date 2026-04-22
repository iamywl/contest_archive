# CLAUDE.md — 수어톡 (SuEoTalk) 프로젝트 작업 지침

> 본 문서는 수어톡 개발의 세부 지침이다.
> 상위 지침: [저장소 루트 CLAUDE.md](../CLAUDE.md) §7 (로컬 LLM 전용) + [현대오토에버 CLAUDE.md](../현대오토에버_배리어프리/CLAUDE.md) (공모전 규격).
> 새 세션 시작 시 **루트 → 공모전 → 본 문서** 순으로 읽고 적용한다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **수어톡 (SuEoTalk)** |
| 공모전 | 2026 현대오토에버 배리어프리 앱 개발 콘테스트 |
| 카테고리 | 청각장애 · 의사소통 접근성 |
| 타깃 | 등록 청각장애인 약 43만 명 + 관공서·병원·매장 직원 |
| 폴더 | `_여분_현대오토에버_수어톡/` |
| 제출 마감 | **2026-05-17 (D-25 긴급 모드)** |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 디렉터리 구조 (고정)

```
_여분_현대오토에버_수어톡/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (읽기 전용, 기술 스택 규격)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트 (S4부터)
│   └── captures/           ← 실제 구동 스크린샷 PNG
└── src/sueotalk/           ← Streamlit PoC (PyTorch 추론), Flutter Phase 2
```

- 새 파일은 위 구조 내에 둔다. 루트에 잡파일 금지.
- 제안서.md는 **기술 스택 규격서**로 취급한다. 구현이 제안서와 어긋나면 제안서를 먼저 정정하고 정정 이력을 남긴다.

---

## 2. 작업 흐름 (D-25 긴급 모드)

```
1. 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, 외부 AI API 금지)
2. 현대오토에버 CLAUDE.md (§2.2 데이터 정직성, §2.4 개발보고서 캡처 의무) 재확인
3. 본 문서 + 제안서.md 재확인 (제안서 = 기술 스택 규격)
4. 작업 계획 수립 (스프린트 단위 1~2일 이내)
5. 코드/문서 변경
6. 실제 구동 → docs/captures/ 에 PNG 캡처
7. 캡처 검토 → 의도와 다르면 수정·재구동·재캡처
8. docs/개발계획서.md §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
9. docs/개발보고서.md 해당 섹션 갱신
10. 요소기능 단위 커밋 (Co-Authored-By: Claude 트레일러 금지)
```

---

## 3. AI·추론 스택 (로컬 전용)

수어톡은 **주 LLM이 없는** 프로젝트다. 핵심은 비전·수어 인식·STT 파이프라인이며,
LLM은 문장 교정·관공서 용어 치환 등 보조 용도로만 쓴다.

| 용도 | 권장 구현 | 비고 |
|---|---|---|
| 수어 포즈 추출 | **MediaPipe Holistic** (손·얼굴·몸 동시) | 온디바이스, 제안서 §8 |
| Sign-to-Text | 경량 Transformer (PyTorch → TFLite/CoreML) | 500문장 프리셋 우선 |
| STT (로컬) | **whisper.cpp** 또는 **MLX Whisper (large-v3)** | 네트워크 불필요, 한국어 WER 낮음 |
| 3D 아바타 | glTF + Skeleton (Three.js / Unity Embed) | 단어 단위 모션 합성 |
| 문장 교정 (보조) | Ollama `llama3.3:70b` | 관공서 용어·존대 보정 |
| 임베딩 (사전 검색) | Ollama `nomic-embed-text` | 500문장 프리셋 매칭 |
| 벡터 DB | FAISS (로컬) | 오프라인 동작 |
| 데이터셋 | 국립국어원 한국수어사전 + KETI 수어 말뭉치 (로컬) | 제안서 §8 [^14][^15] |

**금지 의존성**: `anthropic`, `openai` (OpenAI Whisper **API** 포함), `@anthropic-ai/sdk`,
`@google/genai`, Cohere·Perplexity·Clova Voice API 일체. whisper.cpp / MLX Whisper는 **허용**
(로컬 실행이므로 저장소 §7.2 준수).

---

## 4. 공용 리소스 참조

`_여분_공유/` 의 파일을 **참조**한다 (복사 금지):

- 로컬 LLM 유틸: `_여분_공유/lib/local_llm.py` (Ollama 래퍼)
- 로컬 STT 유틸: `_여분_공유/lib/local_stt.py` (whisper.cpp / MLX Whisper)
- a11y 토큰: `_여분_공유/tailwind-a11y.config.ts` (Flutter Phase 2에서도 참조)
- Mock fixture: `_여분_공유/mock-fixtures/` (KSL 500문장 프리셋·음성 샘플)

---

## 5. 빌드·구동

### Streamlit PoC (S1~S3 우선)

```bash
cd src/sueotalk
uv sync                 # 또는 pip install -e .
streamlit run app.py    # 카메라·마이크 권한 필요
```

### Flutter Phase 2 (S4 이후 선택)

```bash
cd src/sueotalk_flutter
flutter pub get
flutter run -d macos    # 또는 ios / android
```

구동 → 캡처 → 검토의 순환은 **필수**. 캡처 없이는 개발보고서를 진행하지 않는다.

---

## 6. D-25 압축 스프린트 (요약)

| 스프린트 | 기간 | 산출물 |
|---|---|---|
| S1 | 2026-04-22 ~ 2026-04-24 | CLAUDE.md·개발계획서·Streamlit 스캐폴드 |
| S2 | 2026-04-25 ~ 2026-04-29 | MediaPipe Holistic 연동 + 500문장 프리셋 PoC |
| S3 | 2026-04-30 ~ 2026-05-06 | whisper.cpp STT + 3D 아바타 + 회전 분할 UI |
| S4 | 2026-05-07 ~ 2026-05-12 | 관공서 프리셋·오프라인 모드·캡처 + 개발보고서 |
| S5 | 2026-05-13 ~ 2026-05-17 | 시연 영상·README·제출 패키징 |

자세한 스프린트 체크리스트는 [docs/개발계획서.md](docs/개발계획서.md) §4 참조.

---

## 7. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] Streamlit PoC 빌드 1회 이상 성공 + mock 모드로 카메라·마이크 없이 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+ (`docs/captures/`)
- [ ] 개발보고서 검토 체크리스트 7항목 ✅ (현대오토에버 CLAUDE.md §2.4-C)
- [ ] 오프라인 시연 영상 1편 (네트워크 차단 상태에서 500문장 프리셋 통과)
- [ ] 커밋에 `Co-Authored-By: Claude` 트레일러 0건

---

## 8. 데이터 정직성 (제안서 §8.1 계승)

- KSL 공개 데이터셋(국립국어원 한국수어사전·KETI 수어 말뭉치)은 어휘·문장 규모가 서구 수어 대비 작다.
  **공공 용어 500문장 프리셋**에 우선 집중하고, 사용자 제보 기반 데이터로 점진 확장한다.
- 모델 오류 시 **자막·아바타 모두에 '오해 방지' 경고**를 표시하고, **필담 폴백 버튼**을 상시 노출한다.
- 개발보고서의 인식 정확도·응답 지연 수치는 **측정값만** 기재한다. 검증 안 된 수치는 `[추정]` 명시.
- 모든 통계·법적 주장은 제안서 §12 근거자료의 각주 형식
  (`[^번호]: **기관명 「자료명」** (발표연월). 핵심 수치 인용. URL.`)을 따라간다.

---

## 9. 절대 금지

- ❌ 클라우드 AI API (Claude / OpenAI Whisper API / Gemini / Clova Voice 등)
- ❌ 카메라·마이크 영상을 서버 전송 (온디바이스 원칙 위배)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ 추정값을 공식 수치처럼 표현
- ❌ `Co-Authored-By: Claude` 커밋 트레일러

---

*`_여분_현대오토에버_수어톡/CLAUDE.md` · v1 · 2026-04-22*
