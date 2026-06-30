import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

// 추측 불가능한 쿠폰 토큰 (URL-safe, 22자 내외)
export function newToken() {
  return randomBytes(16).toString("base64url");
}

// 직원이 손으로 입력하기 쉬운 짧은 코드용 알파벳 — 헷갈리는 0/O·1/I/L 제외(32자).
// 256 % 32 === 0 이라 바이트 모듈로 편향이 없다.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// 짧은 코드 1개 (기본 6자리, 예: "ABC123")
export function newCode(len = 6) {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

// DB에 없는 고유 코드 1개 (단건 생성용). 충돌 시 재시도, 끝까지 충돌하면 길이를 늘린다.
export async function uniqueCode(len = 6): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = newCode(len);
    const exists = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return newCode(len + 2);
}

// 대량 생성용: 서로 겹치지 않는 코드 n개 (DB 충돌은 unique 제약 + 재시도로 방어)
export function newCodeBatch(n: number, len = 6) {
  const set = new Set<string>();
  while (set.size < n) set.add(newCode(len));
  return Array.from(set);
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
