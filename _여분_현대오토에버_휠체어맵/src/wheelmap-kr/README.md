# WheelMap KR — Streamlit PoC

휠체어 프로파일 기반 배리어프리 내비게이션의 개념 증명(PoC).
**본 프로젝트는 AI를 사용하지 않는다** — 경로는 `networkx` 그래프 가중치 + A* 탐색으로 계산한다.

## 구동

```bash
cd src/wheelmap-kr
pip install -e .
streamlit run app.py
```

구성 파일은 `data/mock_graph.py` · `data/mock_poi.py` 두 개이며, 서울 강남 주변을
수작업으로 구성한 **미니 그래프(12 노드 / 18 엣지)** 와 **BF 인증시설 샘플 POI**를
담고 있다.

## 탭 구성

1. **홈(프로파일)** — 수동/전동/유모차/실버카트 · 폭·회전반경 슬라이더
2. **지도 & 경로** — Folium 지도에 A* 표준 경로 vs 프로파일 경로 동시 오버레이
3. **사진 제보** — 이미지 업로드 + 위치 선택 + Mock 리포트 생성
