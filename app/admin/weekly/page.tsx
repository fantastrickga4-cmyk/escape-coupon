import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { couponUrl } from "@/lib/coupon";
import { fmtKSTDate } from "@/lib/kst";
import { buildMessage, presetByCampaignName, weekKey } from "@/lib/weekly";
import SendList, { type SendRow } from "../SendList";

export const dynamic = "force-dynamic";

export default async function WeeklySendPage() {
  await requireAuth("admin");

  const week = weekKey();

  // 이번 주 정기 발행분 — 캠페인명이 주차로 시작한다(campaignName 규칙)
  const coupons = await prisma.coupon.findMany({
    where: {
      sentTo: { not: null },
      campaign: { name: { startsWith: week } },
    },
    orderBy: { createdAt: "asc" },
    include: { campaign: { select: { name: true } } },
  });

  // 번호별로 묶어 한 사람당 문자 한 통으로 만든다
  const grouped = new Map<string, SendRow>();
  for (const c of coupons) {
    const phone = c.sentTo!;
    const preset = presetByCampaignName(c.campaign.name);
    const row =
      grouped.get(phone) ??
      ({ phone, name: c.sentName, message: "", items: [], redeemed: 0, viewed: 0 } as SendRow);

    row.items.push({
      label: preset?.keyring ?? c.campaign.name,
      link: couponUrl(c.id),
      code: c.code,
    });
    if (!row.name && c.sentName) row.name = c.sentName;
    if (c.status === "redeemed") row.redeemed++;
    if (c.viewedAt) row.viewed++;
    row.message = buildMessage(
      row.name,
      row.items.map((it) => ({ keyring: it.label, link: it.link })),
      c.expiresAt,
    );
    grouped.set(phone, row);
  }
  const rows = [...grouped.values()];

  const expiresAt = coupons[0]?.expiresAt ?? null;

  return (
    <main className="min-h-screen bg-[#fff7e0] p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <Link href="/admin" className="text-sm font-bold text-slate-700 hover:text-black">
          ← 대시보드
        </Link>

        <header>
          <h1 className="text-2xl font-extrabold text-black">이번 주 발송</h1>
          <p className="text-sm font-bold text-slate-600 mt-1">
            {week}주 · {rows.length}명 / 쿠폰 {coupons.length}장
            {expiresAt ? ` · 사용기한 ~ ${fmtKSTDate(expiresAt)}` : ""}
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="nb-card p-6 space-y-2">
            <p className="font-extrabold text-black">이번 주 발행분이 없습니다.</p>
            <p className="text-sm text-slate-600">
              명단을 전달해 발행하면 여기에 발송 목록이 자동으로 채워집니다. 일회성으로 보내려면{" "}
              <Link href="/admin/send" className="underline font-bold">
                문자로 쿠폰 보내기
              </Link>
              를 쓰세요.
            </p>
          </div>
        ) : (
          <SendList rows={rows} />
        )}
      </div>
    </main>
  );
}
