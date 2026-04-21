# Research Folder

FIN:NECT 챌린지 2026 제안서 작성용 참고문헌·리서치 자료 보관소.

## 작성 원칙
- **객관적 기술**: 원문의 사실·수치만 기록. 주관적 해석은 별도 표시(`> NOTE:` 블록).
- **출처 필수**: 모든 자료는 출처(URL, DOI, 저자/연도) 명시.
- **인용 스타일**: APA 7th 또는 IEEE (프로젝트 내 통일).

## 폴더 구조
```
research/
├── README.md              # 본 문서
├── references.md          # 전체 인용 목록 (마스터 인덱스)
├── papers/                # 학술 논문 요약
├── services/              # 상용 서비스 분석 (벤치마크)
├── regulations/           # 금융 규제·정책
└── data/                  # 시장 통계·데이터
```

## 파일 네이밍
- 논문: `papers/{year}_{first-author}_{short-title}.md` (예: `2023_kim_roboadvisor-korea.md`)
- 서비스: `services/{service-name}.md` (예: `services/toss.md`, `services/wealthfront.md`)
- 규제: `regulations/{topic}_{year}.md`
- 데이터: `data/{topic}_{source}_{year}.md`

## 각 파일 필수 헤더
```markdown
---
title: {{정식 제목}}
authors: {{저자 또는 제공사}}
year: {{연도}}
source: {{URL/DOI/ISBN}}
accessed: {{YYYY-MM-DD}}
type: paper | service | regulation | data
---
```
