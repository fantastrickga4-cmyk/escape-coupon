import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { couponUrl } from "@/lib/coupon";
import { deleteCampaign } from "../../actions";
import CopyBox from "./CopyBox";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth("admin");
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { coupons: { orderBy: { createdAt: "asc" }, include: { store: true } } },
  });
  if (!campaign) notFound();

  const links = campaign.coupons.map((c) => couponUrl(c.id));
  const redeemed = campaign.coupons.filter((c) => c.status === "redeemed").length;

  return (
    <main className="min-h-screen bg-[#fff7e0] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/admin" className="nb-btn nb-btn-sm nb-btn-white">
          ← 대시보드
        </Link>

        <header className="nb-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-[#111]">{campaign.name}</h1>
              <p className="text-slate-600 mt-1">{campaign.benefit}</p>
              <p className="text-sm text-slate-500 mt-2">
                {campaign.expiresAt
                  ? `유효기간 ~ ${new Date(campaign.expiresAt).toLocaleDateString("ko-KR")}`
                  : "유효기간 무기한"}{" "}
                · {redeemed}/{campaign.coupons.length} 사용
              </p>
            </div>
            <form action={deleteCampaign}>
              <input type="hidden" name="id" value={campaign.id} />
              <button className="nb-btn nb-btn-sm nb-btn-white font-bold text-red-600">캠페인 삭제</button>
            </form>
          </div>
        </header>

        <section className="nb-card p-6">
          <CopyBox links={links} />
        </section>

        <section className="nb-card p-6">
          <h2 className="font-extrabold text-[#111] mb-3">쿠폰 목록</h2>
          <div className="divide-y-2 divide-black/10">
            {campaign.coupons.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/c/${c.id}`} target="_blank" className="text-slate-700 hover:underline truncate max-w-[60%]">
                  #{i + 1} {c.sentTo ? `→ ${c.sentTo}` : <span className="font-mono">{c.id}</span>}
                </Link>
                {c.status === "redeemed" ? (
                  <span className="nb-tag">
                    사용됨 · {c.store?.name ?? "-"}
                  </span>
                ) : (
                  <span className="nb-tag bg-[#ffd23f]">미사용</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
