# CLAUDE.md — 휠체어맵 (WheelMap KR) 프로젝트 작업 지침

> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 공모전 [`../현대오토에버_배리어프리/CLAUDE.md`](../현대오토에버_배리어프리/CLAUDE.md) 지침을 상속합니다.
> 새 세션·새 작업 시 **루트 CLAUDE.md §7 (AI 사용 제약) → 본 문서 → 제안서.md** 순으로 읽고 규칙을 적용하세요.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **휠체어맵 (WheelMap KR)** |
| 공모전 | 2026 현대오토에버 배리어프리 앱 개발 콘테스트 |
| 카테고리 | 지체장애 · 이동 접근성 |
| 타깃 | 등록 지체·뇌병변 장애인 + 유모차 보호자 + 실버카트 사용 고령자 |
| 폴더 | `_여분_현대오토에버_휠체어맵/` |
| 제출 마감 | **2026-05-17 (D-25)** |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 본 프로젝트의 특수성 — **AI 없음 · 그래프 엔진 중심**

본 프로젝트는 본 저장소의 다른 여분 프로젝트들과 달리 **LLM·ML을 핵심 기능으로 사용하지 않는다**.
제안서 §8 기술 스택도 이 원칙을 반영한다.

| 축 | 본 프로젝트 결정 |
|---|---|
| API 기반 AI | ❌ 금지 (저장소 루트 §7.1 — 여분 프로젝트 공통 제약) |
| 로컬 LLM (Ollama 등) | ❌ **기본적으로 불요** — 경로 탐색은 그래프 가중치·규칙 엔진으로 해결 |
| 예외적 로컬 LLM | 필요 시 **small** 등급 (`qwen2.5:7b`) 로 제보 분류 보조용만 허용. 없어도 서비스 동작해야 함 |
| 핵심 엔진 | **OSRM self-host + 프로파일 가중치 A\* 탐색** (OSM 그래프 커스텀 엣지 가중치) |
| 데이터 | OSM + KODDI BF 인증시설 + TAGO 저상버스 실시간 API + 사용자 사진 제보 |

**함의**: 여느 프로젝트처럼 "로컬 LLM 응답 지연"을 위험으로 볼 필요가 없고,
대신 **경사·단차 데이터 부족**, **지자체별 콜택시 API 파편화**, **제보 스팸/신뢰성**이 핵심 위험이다.

---

## 2. 디렉터리 구조 (고정)

```
_여분_현대오토에버_휠체어맵/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (스택 규격, 읽기 전용 취급)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트 (이후 생성)
│   └── captures/           ← Streamlit 화면 스크린샷 PNG
└── src/
    └── wheelmap-kr/        ← Streamlit PoC + OSRM 연동 코드
        ├── app.py          ← Streamlit 메인 (Leaflet 지도 임베드)
        ├── routing.py      ← 프로파일 가중치 A* / OSRM 호출
        ├── poi.py          ← BF 인증시설 로더
        ├── transit.py      ← TAGO 저상버스 실시간 어댑터
        ├── reports.py      ← 사용자 사진 제보 저장 (MinIO / 로컬 S3 호환)
        ├── data/           ← OSM 추출 + BF POI 샘플
        └── pyproject.toml
```

---

## 3. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (API 기반 AI 금지 — 본 프로젝트는 로컬 LLM도 기본 불요)
2. 본 문서 + 제안서.md 재확인 (제안서 §6 5기능 · §8 기술 스택이 규격)
3. 작업 계획 수립 (TODO)
4. 코드/문서 변경
5. 실제 구동 → 캡처 (Streamlit + Leaflet 화면)
6. 캡처 검토 → 의도와 다르면 수정·재캡처
7. 개발계획서 §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
8. 개발보고서 해당 섹션 갱신
9. 기능 단위 커밋 (기획·라우팅·POI·제보·캡처 단위)
```

---

## 4. 기술 스택 (제안서 §8 고정)

| 계층 | 선택 | 근거 |
|---|---|---|
| 프론트 PoC | **Streamlit** + `streamlit-folium` | 지도 + 컨트롤 빠른 시연 |
| 지도 | **Leaflet** (via Folium) + OSM 타일 | 경량, 커스텀 오버레이 |
| 경로 엔진 | **OSRM self-host** (Docker) + 프로파일 가중치 후처리 | 그래프 커스텀 가중치 가능 |
| 탐색 알고리즘 | **A\*** (distance + α·(1−접근성)) | 휠체어 프로파일 특화 |
| 그래프 데이터 | **OpenStreetMap** 추출 (서울 도심 우선) | 오픈 라이선스 |
| BF POI | **KODDI Barrier Free 인증시설** 데이터셋 | 공식 출처 |
| 대중교통 | **TAGO(국가대중교통정보센터) 저상버스 API** | 국가 표준 |
| 콜택시 | 지자체 API(서울시 등) + 전화 딥링크(`tel:`) 폴백 | 지자체별 파편화 대응 |
| 사진 제보 | 로컬 **MinIO** (S3 호환) 또는 로컬 파일시스템 | 데모 완전 오프라인 |
| 메타 DB | SQLite (PoC) / Postgres (확장) | 경량 |
| 언어 | Python 3.11+ | 저장소 표준 (§3.1) |

**AI 스택: 해당 없음.** 예외적으로 제보 문구 자동 분류가 필요해지면 Ollama `qwen2.5:7b` (small) 단일 모델에 한해 허용.

---

## 5. 빌드·구동

### Streamlit PoC
```bash
cd src/wheelmap-kr
uv sync      # 또는 pip install -e .
streamlit run app.py
```

### OSRM self-host (Docker)
```bash
# 서울 도심 OSM 추출(.osm.pbf) → OSRM 전처리 → 서빙
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend \
  osrm-extract -p /opt/foot.lua /data/seoul.osm.pbf
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-partition /data/seoul.osrm
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-customize /data/seoul.osrm
docker run -t -i -p 5000:5000 -v "${PWD}/data:/data" osrm/osrm-backend \
  osrm-routed --algorithm mld /data/seoul.osrm
```

### Mock 모드
- TAGO / 서울시 콜택시 API 키 부재 → `mock-fixtures/tago_bus.json` 기반 폴백 동작 필수.

구동 → 캡처 → 검토의 순환이 **필수**. (저장소 루트 §2.3)

---

## 6. 제출 DoD (Definition of Done) · **D-25 긴급 모드**

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] `src/wheelmap-kr/` Streamlit 앱 1회 이상 실행 성공
- [ ] OSRM 로컬 기동 or Mock 모드로 경로 탐색 1건 이상 시연
- [ ] 프로파일(수동·전동·유모차) 전환 시 경로 변화 캡처 1장 이상
- [ ] Mock 모드로 API 키 없이 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+ (프로파일·경로·POI·대중교통·제보)
- [ ] 개발보고서 검토 체크리스트 ✅
- [ ] 커밋에 **Co-Authored-By: Claude 트레일러 0건**

---

## 7. 데이터·개인정보 원칙

| 축 | 규칙 |
|---|---|
| 경로 기록 | 로그 익명화 · 30일 자동 파기 (제안서 R4) |
| 사진 제보 | EXIF 위치 외 PII 제거, 얼굴·번호판 자동 블러(선택) |
| 제보 신뢰성 | 사진 + 지오태그 + 다중 제보 가중, 스팸 신고 가능 (R5) |
| API 키 | `.env` 관리, 저장소 커밋 금지 |

---

## 8. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova 등) — 저장소 루트 §7.1
- ❌ 본 프로젝트에 불필요한 로컬 LLM 상시 로드 (RAM 낭비, 그래프 엔진으로 충분)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ API 키 하드코딩
- ❌ 경사·단차 데이터를 **검증 없이 "정확"**으로 표기 (부정확 구간은 `[추정]` 표기)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ Co-Authored-By: Claude 커밋 트레일러

---

## 9. 주요 위험 (제안서 §11 요약)

| ID | 위험 | 영향 | 대응 |
|---|---|---|---|
| R1 | 경사·단차 데이터 불완전 | 高 | **서울 도심 우선 커버**, 사용자 제보 보완 |
| R2 | 제보 신뢰성 | 中 | 사진 + 지오태그 + 다중 제보 가중 |
| R3 | 장애인콜택시 지자체별 API 상이 | 中 | 어댑터 레이어 + **tel: 전화 딥링크 폴백** |
| R4 | PII (경로 기록) | 高 | 로그 익명화, 30일 파기 |
| R5 | 사용자 제보 스팸 | 中 | 계정 + 레이팅 + 신고 |

---

*`_여분_현대오토에버_휠체어맵/CLAUDE.md` · v1 · 2026-04-22*
