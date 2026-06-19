import { randomBytes } from "crypto";

// 추측 불가능한 쿠폰 토큰 (URL-safe, 22자 내외)
export function newToken() {
  return randomBytes(16).toString("base64url");
}

// QR/링크에 담길 고객용 쿠폰 주소
export function couponUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base}/c/${token}`;
}

// 추천 링크 주소 (/r/[token])
export function referralUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base}/r/${token}`;
}

// 스캔 결과 문자열에서 토큰만 추출 (전체 URL이든 토큰만이든 모두 처리)
export function extractToken(scanned: string) {
  const trimmed = scanned.trim();
  const match = trimmed.match(/\/c\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : trimmed;
}

export const STORES = [
  { id: 1, name: "1호점" },
  { id: 2, name: "2호점" },
  { id: 3, name: "3호점" },
];
