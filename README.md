# 매장 쿠폰 발행기

매장에서 사용하는 1회용 쿠폰 발급·사용 관리 시스템. 앱 설치 없이 웹으로 동작합니다.

## 구성

- **관리자** `/admin` — 캠페인 발행, 대량 발급, 사용 현황(전체·호점별), 캠페인별 링크 관리
- **직원** `/staff` — 호점만 선택하면 입장(비밀번호 없음). 카메라 QR 스캔 또는 코드 입력 → 쿠폰 사용 처리
- **고객** `/c/[token]` — 쿠폰 QR 화면 (직원에게 보여주면 됨)

## 핵심 동작

- 쿠폰 토큰은 추측 불가능한 랜덤값이며, **사용 여부 판단은 항상 서버 DB 상태**로 처리합니다.
- 사용 처리는 `UPDATE ... WHERE status='issued'` **원자적 갱신**이라, 동시에 여러 번 스캔돼도 단 1건만 성공합니다(검증 완료).
- 어느 호점에서 사용됐는지 기록됩니다.

## 실행 (로컬)

```bash
npm install
npx prisma migrate dev      # DB 생성 (최초 1회)
node prisma/seed.mjs        # 1/2/3호점 등록 (최초 1회)
npm run dev
```

관리자 비밀번호는 `.env`에 있습니다 — **배포 전 반드시 변경**하세요.

- 관리자: `ADMIN_PASSWORD` (기본 `admin1234`)
- 직원: 비밀번호 없음 (호점 선택만으로 입장)

## 배포 (Vercel)

1. `.env`의 `DATABASE_URL`을 SQLite → **Vercel Postgres(Neon)** URL로 교체
2. `prisma/schema.prisma`의 `provider`를 `sqlite` → `postgresql`로 변경 후 `npx prisma migrate deploy`
3. `NEXT_PUBLIC_BASE_URL`을 실제 도메인으로 설정 (QR/링크에 사용됨)
4. 비밀번호 환경변수를 Vercel 프로젝트 설정에 등록

> SQLite는 로컬 개발용입니다. Vercel 서버리스 환경에서는 Postgres를 사용하세요.
> 카메라 QR 스캔은 보안상 HTTPS(또는 localhost)에서만 동작합니다.

## 기술 스택

Next.js 16 (App Router) · React 19 · Prisma 6 · Tailwind CSS · qrcode · html5-qrcode
