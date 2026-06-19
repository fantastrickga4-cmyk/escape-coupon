# 🔓 방탈출 쿠폰 발행기

방탈출 매장용 **1회용 쿠폰 발급·발송·사용 관리** 웹 서비스. 고객·직원 모두 앱 설치 없이 웹/QR로 사용합니다.

**🌐 라이브:** https://coupon-ruby-tau.vercel.app

---

## 주요 기능

- **멀티 매장** — 1·2·3호점 구분, 어느 호점에서 사용됐는지 기록
- **1회용 보장** — `UPDATE ... WHERE status='issued'` 원자적 처리로 중복·동시 스캔·캡처 재사용 차단
- **무료 문자(SMS) 발송** — 번호 붙여넣기 → 고객별 쿠폰 생성 → 내 폰 문자앱으로 일괄 전송(비용 0원)
- **친구 추천** — 추천 링크로 신규 유입, 친구·추천인 양측 보상 쿠폰 자동 발급
- **다른 테마 유도** — 이미 플레이한 테마는 제외한 쿠폰 발급(방탈출 재방문 전략)
- **시간·요일 한정 / 단체(최소 인원) 할인** — 빈 시간대·단체 예약 유도 (시간은 KST 기준)
- **리뷰 작성 보상** — 고객 쿠폰 화면에 리뷰 작성 CTA 노출
- **실시간 현황 · 사용 취소** — 대시보드 자동 갱신, 잘못 처리한 쿠폰 되돌리기, 활동 로그
- **인증** — 관리자는 비밀번호, 직원은 호점 선택만으로 입장(무비번)

## 화면

| 경로 | 설명 |
|------|------|
| `/` | 홈 |
| `/admin` | 관리자 대시보드 — 발행·현황·실시간 사용·취소 |
| `/admin/send` | 문자로 쿠폰 보내기 |
| `/admin/refer` | 친구 추천 관리 |
| `/admin/themes` | 테마(방) 관리 |
| `/staff` | 직원 — QR 스캔 / 코드 입력 사용처리 |
| `/c/[token]` | 고객 쿠폰(QR) |
| `/r/[token]` | 친구 추천 수락 |

## 기술 스택

Next.js 16 (App Router) · React 19 · Prisma 6 (**PostgreSQL / Neon**) · Tailwind CSS v4 · qrcode · html5-qrcode
디자인: **Playful Pop**(뉴브루탈리즘).

---

## 로컬 개발

요구: Node 20+, PostgreSQL 접속 URL (Neon 무료 티어 권장)

```bash
npm install

# .env 작성
#   DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"   # 런타임(풀러)
#   DIRECT_URL="postgresql://.../neondb?sslmode=require"               # 마이그레이션(직결)
#   ADMIN_PASSWORD="원하는비밀번호"
#   NEXT_PUBLIC_BASE_URL="http://localhost:3000"

npx prisma generate
npx prisma db push        # 테이블 생성
node prisma/seed.mjs      # 1·2·3호점 시드
npm run dev
```

> 카메라 QR 스캔은 보안상 HTTPS(또는 localhost)에서만 동작합니다.

## 배포 (Vercel + Neon)

- GitHub `main` 브랜치 푸시 시 **자동 배포**됩니다.
- **환경변수(Production)**: `DATABASE_URL`(풀러), `DIRECT_URL`(직결), `ADMIN_PASSWORD`, `NEXT_PUBLIC_BASE_URL`(실제 도메인).
- 빌드 시 다음이 자동 실행되어 테이블 생성·매장 시드가 처리됩니다:
  ```
  prisma generate && prisma db push && node prisma/seed.mjs && next build
  ```
- DB: **Neon Postgres** — 런타임은 풀러 URL, 마이그레이션/`db push`는 `directUrl`(직결) 사용.

## 테스트 (RPA 회귀 테스트)

실제 브라우저(Puppeteer)로 전 기능을 클릭·입력하며 검사합니다. (22개 항목, 데이터 자동 정리 포함)

```bash
npm i -D puppeteer-core   # 최초 1회
# 로컬
RPA_BASE="http://localhost:3000" node docs/rpa-test.cjs
# 라이브
RPA_BASE="https://coupon-ruby-tau.vercel.app" node docs/rpa-test.cjs
```

검사 범위: 로그인 · 캠페인 발행(일반/리뷰/추천) · 문자 발송 · 친구 추천(양측 발급) · 고객 QR · 리뷰 CTA · 직원 사용처리 · 중복 차단 · 단체 인원 · 테마 제외 · 사용 취소.

## 문서 / 에셋 (`docs/`)

- `overview.png` — 서비스 소개(기능 한 장)
- `staff-manual.png` — 직원용 사용 설명서
- `admin-manual.png` — 관리자용 사용 설명서
- `rpa-test.cjs` — RPA 회귀 테스트 스크립트

## 보안 주의

- 공개 배포 전 **`ADMIN_PASSWORD`를 강력한 값으로 변경**하세요.
- DB 연결 문자열·비밀번호는 코드에 두지 말고 **환경변수로만** 관리합니다(`.env`는 git 제외).
