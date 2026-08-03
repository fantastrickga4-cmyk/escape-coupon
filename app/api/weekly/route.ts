// 주간 정기 발행 API — 번호 목록만 받아서 이번 주 쿠폰 2종을 발급하고
// 문자로 보낼 메시지까지 만들어 돌려준다. 오래된 캠페인 정리도 함께 처리.
//
//   curl -X POST https://<도메인>/api/weekly \
//     -H "authorization: Bearer $WEEKLY_SECRET" \
//     -H "content-type: application/json" \
//     -d '{"phones": ["010-1234-5678"]}'
//
// 옵션: kinds(["lockdown"|"eternity"], 기본 둘 다) · greeting(첫 줄 교체) · dryRun(발급 없이 계획만)

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { newToken, uniqueCode, couponUrl } from "@/lib/coupon";
import { parsePhones } from "@/lib/phone";
import {
  WEEKLY_PRESETS,
  WEEKLY_HEADLINE,
  RETENTION_WEEKS,
  campaignName,
  expiryFrom,
  fmtKSTDate,
  retentionCutoff,
  weekKey,
} from "@/lib/weekly";

const MAX_PHONES = 200;

// 시크릿 미설정이면 무조건 거부한다(기본값을 두면 공개 엔드포인트가 되므로).
function authorized(request: Request) {
  const secret = process.env.WEEKLY_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type Item = { kind: string; label: string; link: string; code: string | null };

const MARKS = ["①", "②", "③", "④"];

function buildMessage(greeting: string, items: Item[], expiresAt: Date) {
  const head = greeting || WEEKLY_HEADLINE;
  const body = items
    .map((it, i) => `${MARKS[i] ?? `${i + 1}.`} ${it.label}\n${it.link}`)
    .join("\n\n");
  return `${head}\n\n${body}\n\n사용기한 ~ ${fmtKSTDate(expiresAt)}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: "인증에 실패했습니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const raw = Array.isArray(body.phones) ? body.phones.join(" ") : String(body.phones ?? "");
  const phones = parsePhones(raw);
  const greeting = String(body.greeting ?? "").trim();
  const dryRun = body.dryRun === true;

  const kinds: string[] | null = Array.isArray(body.kinds) && body.kinds.length > 0 ? body.kinds.map(String) : null;
  const presets = kinds ? WEEKLY_PRESETS.filter((p) => kinds.includes(p.key)) : WEEKLY_PRESETS;
  if (presets.length === 0) {
    const valid = WEEKLY_PRESETS.map((p) => p.key).join(", ");
    return NextResponse.json({ ok: false, message: `kinds 값이 올바르지 않습니다. (가능: ${valid})` }, { status: 400 });
  }
  if (phones.length === 0) {
    return NextResponse.json({ ok: false, message: "유효한 전화번호가 없습니다." }, { status: 400 });
  }
  if (phones.length > MAX_PHONES) {
    return NextResponse.json({ ok: false, message: `한 번에 최대 ${MAX_PHONES}개까지 가능합니다.` }, { status: 400 });
  }

  const now = new Date();
  const week = weekKey(now);
  const cutoff = retentionCutoff(now);

  // 정리 대상 — 만료일이 보관기간을 넘긴 캠페인. 만료일이 없는(무기한) 캠페인은 lt 비교에서 제외된다.
  const stale = await prisma.campaign.findMany({
    where: { expiresAt: { lt: cutoff } },
    select: { id: true, name: true, expiresAt: true, coupons: { select: { status: true } } },
  });
  const purgePlan = stale.map((c) => ({
    name: c.name,
    total: c.coupons.length,
    used: c.coupons.filter((x) => x.status === "redeemed").length,
    expiredAt: fmtKSTDate(c.expiresAt),
  }));

  if (dryRun) {
    const existing = await prisma.campaign.findMany({
      where: { name: { in: presets.map((p) => campaignName(p, week)) } },
      select: { name: true, expiresAt: true },
    });
    return NextResponse.json({
      ok: true,
      dryRun: true,
      week,
      phones,
      campaigns: presets.map((p) => {
        const name = campaignName(p, week);
        const found = existing.find((e) => e.name === name);
        return {
          name,
          benefit: p.benefit,
          status: found ? "기존 캠페인 재사용" : "새로 생성 예정",
          expiresAt: fmtKSTDate(found?.expiresAt ?? expiryFrom(now)),
        };
      }),
      willPurge: purgePlan,
    });
  }

  // 이번 주 캠페인 확보 — 같은 주에 다시 실행하면 새로 만들지 않고 재사용한다(멱등).
  const campaigns = [];
  for (const preset of presets) {
    const name = campaignName(preset, week);
    let campaign = await prisma.campaign.findFirst({ where: { name } });
    let created = false;
    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: { name, benefit: preset.benefit, kind: "normal", expiresAt: expiryFrom(now) },
      });
      created = true;
    }
    campaigns.push({ preset, campaign, created });
  }

  // 번호별 발급 — 같은 캠페인에 미사용 쿠폰이 이미 있으면 재사용해 중복 발급을 막는다.
  const rows = [];
  let issued = 0;
  for (const phone of phones) {
    const items: Item[] = [];
    for (const { preset, campaign } of campaigns) {
      let coupon = await prisma.coupon.findFirst({
        where: { campaignId: campaign.id, sentTo: phone, status: "issued" },
      });
      if (!coupon) {
        coupon = await prisma.coupon.create({
          data: {
            id: newToken(),
            code: await uniqueCode(),
            campaignId: campaign.id,
            expiresAt: campaign.expiresAt,
            sentTo: phone,
          },
        });
        issued++;
      }
      items.push({ kind: preset.key, label: preset.label, link: couponUrl(coupon.id), code: coupon.code });
    }
    // 만료일은 캠페인 기준 — 같은 주에 나중에 추가된 번호도 그 주 기한을 따른다.
    rows.push({ phone, message: buildMessage(greeting, items, campaigns[0].campaign.expiresAt!), items });
  }

  // 보관기간 지난 캠페인 삭제 — 쿠폰은 onDelete: Cascade로 함께 지워지고, 요약 한 줄만 남긴다.
  for (const c of stale) {
    const plan = purgePlan.find((p) => p.name === c.name)!;
    await prisma.log.create({
      data: {
        type: "purge",
        detail: `${c.name} 정리 — 발급 ${plan.total} / 사용 ${plan.used} (만료 ${plan.expiredAt})`,
      },
    });
    await prisma.campaign.delete({ where: { id: c.id } });
  }

  return NextResponse.json({
    ok: true,
    week,
    expiresAt: fmtKSTDate(campaigns[0].campaign.expiresAt),
    campaigns: campaigns.map(({ preset, campaign, created }) => ({
      name: campaign.name,
      benefit: preset.benefit,
      created,
      adminUrl: `/admin/campaign/${campaign.id}`,
    })),
    issued,
    reused: phones.length * campaigns.length - issued,
    rows,
    purged: purgePlan,
    retentionWeeks: RETENTION_WEEKS,
  });
}
