// 발행 API(/api/weekly, /api/birthday)가 공유하는 인증·보관정리·쿠폰 발급 로직.

import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { newToken, uniqueCode } from "@/lib/coupon";
import { fmtKSTDate } from "@/lib/kst";
import { retentionCutoff } from "@/lib/weekly";

// 시크릿 미설정이면 무조건 거부한다(기본값을 두면 공개 엔드포인트가 되므로).
export function authorizeSecret(request: Request) {
  const secret = process.env.WEEKLY_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export type PurgeEntry = { name: string; total: number; used: number; expiredAt: string };

// 만료일이 보관기간을 넘긴 캠페인을 찾는다. 만료일이 없는(무기한) 캠페인은 lt 비교에서 제외된다.
export async function collectStale(now: Date) {
  const stale = await prisma.campaign.findMany({
    where: { expiresAt: { lt: retentionCutoff(now) } },
    select: { id: true, name: true, expiresAt: true, coupons: { select: { status: true } } },
  });
  const plan: PurgeEntry[] = stale.map((c) => ({
    name: c.name,
    total: c.coupons.length,
    used: c.coupons.filter((x) => x.status === "redeemed").length,
    expiredAt: fmtKSTDate(c.expiresAt),
  }));
  return { stale, plan };
}

// 쿠폰은 onDelete: Cascade로 함께 지워지고, 요약 한 줄만 로그에 남긴다.
export async function purgeStale(stale: { id: string; name: string }[], plan: PurgeEntry[]) {
  for (const c of stale) {
    const p = plan.find((x) => x.name === c.name);
    if (!p) continue;
    await prisma.log.create({
      data: { type: "purge", detail: `${c.name} 정리 — 발급 ${p.total} / 사용 ${p.used} (만료 ${p.expiredAt})` },
    });
    await prisma.campaign.delete({ where: { id: c.id } });
  }
}

// 같은 캠페인에 같은 번호의 미사용 쿠폰이 있으면 재사용한다(중복 발급 방지).
// 재실행으로 이름이 새로 들어오면 채워 넣는다(이름 없이 먼저 발급한 경우 보정).
export async function ensureCoupon(opts: {
  campaignId: string;
  phone: string;
  name: string | null;
  expiresAt: Date | null;
}) {
  const found = await prisma.coupon.findFirst({
    where: { campaignId: opts.campaignId, sentTo: opts.phone, status: "issued" },
  });
  if (found) {
    if (opts.name && found.sentName !== opts.name) {
      const updated = await prisma.coupon.update({
        where: { id: found.id },
        data: { sentName: opts.name },
      });
      return { coupon: updated, created: false };
    }
    return { coupon: found, created: false };
  }
  const coupon = await prisma.coupon.create({
    data: {
      id: newToken(),
      code: await uniqueCode(),
      campaignId: opts.campaignId,
      expiresAt: opts.expiresAt,
      sentTo: opts.phone,
      sentName: opts.name,
    },
  });
  return { coupon, created: true };
}
