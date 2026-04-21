# 02. Vercel 배포

**목표**: 책크인을 누구나 접속 가능한 **공개 URL**로 배포하고 **QR 코드**를 생성한다.
**예상 소요**: 30분~1시간 (첫 배포 기준)

---

## 0. 왜 Vercel 인가

- Next.js 를 만든 회사 → 네이티브 지원, 무설정.
- **무료 티어**에서 심사·시연 트래픽 충분 (개인 프로젝트 제한 100GB/월).
- GitHub 연동 → push 하면 자동 재배포.
- 한국에서 접속 지연 없음 (Global CDN).

---

## 1. 사전 준비

- [ ] GitHub 계정
- [ ] [01번 가이드](01_공공데이터_API_연동.md) 완료 (선택이지만 권장)
- [ ] 로컬에서 `pnpm build` 가 통과

---

## 2. GitHub 저장소 생성 & 코드 푸시

### 2.1 `.gitignore` 확인

현재 저장소는 Next.js 스캐폴딩 시 자동 생성된 `.gitignore` 가 있어
`.env.local`, `node_modules`, `.next` 가 무시되도록 되어 있습니다.
확인:

```bash
cat dev/chekcin/.gitignore | grep -E "\.env|\.next|node_modules"
```

셋 다 보이면 OK.

### 2.2 루트에서 git 초기화

현재 `dev/chekcin/` 안에 이미 git repo가 초기화되어 있을 수 있습니다
(`create-next-app` 이 기본으로 함). 확인:

```bash
cd dev/chekcin
git status
```

초기화 안 되어 있으면:

```bash
cd dev/chekcin
git init
git add .
git commit -m "Initial commit — 책크인 MVP"
```

### 2.3 GitHub 저장소 생성

1. https://github.com/new
2. Repository name: `chekcin` (또는 `chekcin-contest`)
3. **Private 추천** (공모전 심사 전까지)
4. README/gitignore/License 체크박스는 **비움** (이미 로컬에 있음)
5. Create repository

### 2.4 푸시

GitHub 가 제공하는 명령을 그대로:

```bash
cd dev/chekcin
git remote add origin https://github.com/<YOUR_GITHUB>/chekcin.git
git branch -M main
git push -u origin main
```

---

## 3. Vercel 프로젝트 생성

### 3.1 로그인

1. https://vercel.com/signup
2. **[Continue with GitHub]** 선택 (권장: 자동 저장소 연결)

### 3.2 Import Project

1. 대시보드 → **[Add New…] → [Project]**
2. Import Git Repository 목록에서 방금 만든 `chekcin` 선택 → **Import**
3. **Configure Project** 화면에서:
   - **Framework Preset**: Next.js (자동 감지됨)
   - **Root Directory**: 기본값(`.`) 그대로. 만약 repo 루트가 `2026_공모전/` 이라면 `dev/chekcin` 으로 수정 필요.
   - **Build & Output Settings**: 기본값 유지

### 3.3 환경 변수 (가장 중요)

**Environment Variables** 섹션에서 다음을 추가:

| NAME | VALUE | Environments |
|---|---|---|
| `DATA_GO_KR_KEY` | 공공데이터포털 Encoding 키 | Production · Preview · Development |
| `OPENAI_API_KEY` | (선택) OpenAI 키 | Production |
| `ANTHROPIC_API_KEY` | (선택) Anthropic 키 | Production |

키가 없더라도 mock fallback 이 동작하므로 배포 자체는 가능.
하지만 심사 전 반드시 실 키 주입 권장.

### 3.4 Deploy

**[Deploy]** 버튼 클릭 → 약 1~2분 후 배포 완료.
성공 시 `https://chekcin-<hash>.vercel.app` 같은 URL 이 발급.

---

## 4. 커스텀 도메인 (선택)

기본 URL 이 길고 해시가 붙어 있어 QR 스캔용으로는 불친절할 수 있습니다.
커스텀 짧은 도메인을 원하면:

### 4.1 Vercel 서브도메인 변경

1. Vercel Project → **Settings** → **Domains**
2. 기존 URL 옆 **Edit** → 원하는 이름으로 변경 (예: `chekcin.vercel.app`)
3. 이미 사용 중이면 `chekcin-klid.vercel.app` 같이 변형.
4. 무료.

### 4.2 본인 도메인 연결 (선택)

1. Domains → **Add** → `chekcin.example.com` 입력
2. Vercel 이 보여주는 CNAME/A 레코드를 도메인 등록업체(가비아, 카페24 등)에 등록
3. 보통 5~30분 내 SSL 발급 후 활성화

공모전 용도로는 무료 Vercel 서브도메인이면 충분합니다.

---

## 5. 배포 상태 확인

### 5.1 기본 헬스 체크

```bash
# 배포 URL로 교체
DEPLOY_URL="https://chekcin.vercel.app"

curl -s $DEPLOY_URL/api/libraries | jq '.data | length'
# 12 (또는 실 API 연동 후에는 실제 도서관 수)

curl -s "$DEPLOY_URL/api/ai/forecast?lib=lib-001" | jq '.points | length'
# 7
```

### 5.2 모바일 접속 테스트

- iOS Safari, Android Chrome 에서 해당 URL 접속
- 위치 권한 허용 → 근처 도서관이 지도에 뜨는지 확인
- 각 페이지(홈·코치·체크인·루틴) 이동 해보기

### 5.3 자동 검증 스크립트 원격 실행

```bash
cd dev/chekcin
BASE_URL=https://chekcin.vercel.app node scripts/verify.mjs
```

`Route / returns 200` 항목이 통과하지 않으면 Vercel 빌드 로그 확인
(Vercel Dashboard → Deployments → 가장 최근 → Logs).

---

## 6. QR 코드 생성

심사위원이 모바일로 바로 접속하도록 **QR 코드 이미지**를 만듭니다.

### 6.1 방법 A — 온라인 (간단)

1. https://www.qrcode-monkey.com/ 또는 https://qrcode.kaywa.com/ 접속
2. URL 입력 (예: `https://chekcin.vercel.app`)
3. 로고 추가 (선택) — Lucide 의 `BookOpen` SVG 같은 것
4. PNG 다운로드 → `docs/screenshots/qr.png` 로 저장

### 6.2 방법 B — CLI (재현성)

```bash
npm install -g qrcode
qrcode "https://chekcin.vercel.app" -o docs/screenshots/qr.png -t png
```

### 6.3 QR 코드를 기획서에 삽입

[붙임4] 기획서 부록 섹션에 다음과 같이 삽입:

> ### 부록. 시연 URL 및 QR
> - URL: https://chekcin.vercel.app
> - QR:
>   ![QR](qr.png)

---

## 7. 지속 배포 (CI/CD)

한 번 연결되면 이후는 간단합니다:

```bash
# 코드 수정
vim src/app/page.tsx
# 커밋 & 푸시
git add -A && git commit -m "..." && git push
```

Vercel 이 자동으로:
1. Preview 배포 (PR 브랜치)
2. main 에 머지 시 Production 재배포

---

## 8. 롤백

배포 후 문제가 생기면:

1. Vercel → Deployments 탭
2. 이전 성공한 배포 우측 메뉴 → **Promote to Production**
3. 즉시 롤백 (1분 이내).

---

## 9. 주요 설정 파일

필요에 따라 `dev/chekcin/vercel.json` 을 만들어 세부 설정 가능:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=60, s-maxage=300" }
      ]
    }
  ]
}
```

> ⚠️ 주의: 사용자별로 달라지는 응답(예: `?near=` 쿼리)은 `s-maxage` 가 있어도
> 쿼리 단위로 캐시되므로 문제 없지만, CDN 레이어 캐시가 맘에 안 들면 제거.

---

## 10. 체크리스트

- [ ] GitHub 저장소 생성 & 코드 push
- [ ] Vercel 프로젝트 import 완료
- [ ] 환경변수 `DATA_GO_KR_KEY` 주입
- [ ] Production 배포 성공 (초록 체크)
- [ ] 배포 URL 기록: `________________`
- [ ] 모바일에서 접속·동작 확인
- [ ] `scripts/verify.mjs` 원격 실행 PASS
- [ ] QR 코드 생성 → `docs/screenshots/qr.png` 저장
- [ ] 기획서 부록에 URL·QR 기재

완료되면 **03. 시연 영상 녹화** 로 이동.
