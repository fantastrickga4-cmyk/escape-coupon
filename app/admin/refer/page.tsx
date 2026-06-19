import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { couponUrl, referralUrl } from "@/lib/coupon";
import CreateReferralForm from "./CreateReferralForm";
import ShareRow from "./ShareRow";

export const dynamic = "force-dynamic";

function fmtPhone(p: string) {
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return p;
}

export default async function ReferPage() {
  await requireAuth("admin");

  const [campaigns, referrals, rewards] = await Promise.all([
    prisma.campaign.findMany({
      where: { kind: "referral" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, benefit: true },
    }),
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      include: { campaign: { select: { name: true, benefit: true } } },
    }),
    // 미발송 추천인 보상 쿠폰
    prisma.coupon.findMany({
      where: { benefitOverride: { not: null }, status: "issued" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#fff7e0] p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <Link href="/admin" className="text-sm font-bold text-slate-700 hover:text-black">
          ← 대시보드
        </Link>
        <header>
          <h1 className="text-2xl font-extrabold text-black">친구 추천 관리</h1>
          <p className="text-sm text-slate-600 mt-1">
            추천인에게 링크를 주고, 친구가 그 링크로 쿠폰을 받으면 추천인에게도 보상이 발급됩니다.
          </p>
        </header>

        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-600">
            먼저 <Link href="/admin" className="underline">대시보드</Link>에서 쿠폰 유형 “친구 추천” 캠페인을 만들어주세요.
          </p>
        ) : (
          <CreateReferralForm campaigns={campaigns} />
        )}

        {/* 추천 링크 목록 — 추천인에게 전달 */}
        {referrals.length > 0 && (
          <section className="nb-card p-6 space-y-3">
            <h2 className="font-extrabold text-black">추천 링크 (추천인에게 전달)</h2>
            <div className="space-y-2">
              {referrals.map((r) => (
                <ShareRow
                  key={r.id}
                  phone={r.referrerPhone}
                  label={`${fmtPhone(r.referrerPhone)} · ${r.refereeCount}명 추천`}
                  sub={referralUrl(r.id)}
                  message={`[친구 추천] 이 링크를 친구에게 공유해 주세요!\n친구가 가입하면 회원님께도 '${r.campaign.benefit}' 혜택이 드려져요.\n${referralUrl(r.id)}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* 발급된 추천인 보상 — 추천인에게 전달 */}
        {rewards.length > 0 && (
          <section className="nb-card p-6 space-y-3">
            <h2 className="font-extrabold text-black">발급된 추천 보상 (추천인에게 전달)</h2>
            <div className="space-y-2">
              {rewards.map((c) => (
                <ShareRow
                  key={c.id}
                  phone={c.sentTo ?? ""}
                  label={`${c.sentTo ? fmtPhone(c.sentTo) : "-"} · ${c.benefitOverride}`}
                  sub={couponUrl(c.id)}
                  message={`추천 감사 보상이 도착했어요!\n${c.benefitOverride}\n${couponUrl(c.id)}`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
