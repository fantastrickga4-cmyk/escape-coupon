import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { couponUrl } from "@/lib/coupon";
import { deleteCampaign } from "../../actions";
import CopyBox from "./CopyBox";
import RefreshButton from "./RefreshButton";

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
  const total = campaign.coupons.length;
  const sent = campaign.coupons.filter((c) => c.sentTo).length;
  const viewed = campaign.coupons.filter((c) => c.viewedAt).length;
  const redeemed = campaign.coupons.filter((c) => c.status === "redeemed").length;

  const timeFmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "";

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

        {/* 발송 → 열람 → 사용 현황 한눈에 */}
        <section className="nb-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-[#111]">발송·열람 현황</h2>
            <RefreshButton />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Funnel label="발급" value={total} />
            <Funnel label="발송" value={sent} sub="번호 지정" />
            <Funnel label="열람" value={viewed} sub="링크 확인" accent="text-[#4ad7d4]" />
            <Funnel label="사용" value={redeemed} accent="text-[#ff5d8f]" />
          </div>
          <p className="text-xs text-slate-500">
            ※ ‘열람’은 받는 분이 실제로 쿠폰 링크를 연 횟수 기준입니다(관리자 미리보기는 제외). 무료 문자 방식이라 ‘발송’은 전송 성공이 아니라 번호가 지정된 쿠폰 수예요.
          </p>
        </section>

        <section className="nb-card p-6">
          <CopyBox links={links} />
        </section>

        <section className="nb-card p-6">
          <h2 className="font-extrabold text-[#111] mb-3">쿠폰 목록</h2>
          <div className="divide-y-2 divide-black/10">
            {campaign.coupons.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <Link
                  href={`/c/${c.id}`}
                  target="_blank"
                  className="text-slate-700 hover:underline truncate min-w-0 flex-1"
                >
                  #{i + 1} {c.sentTo ? `→ ${c.sentTo}` : <span className="font-mono">{c.id}</span>}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* 열람 여부 */}
                  {c.viewedAt ? (
                    <span className="nb-tag bg-[#4ad7d4]" title={`${c.viewCount}회 열람`}>
                      👁 열람 {timeFmt(c.viewedAt)}
                    </span>
                  ) : (
                    <span className="nb-tag bg-white text-slate-400">미열람</span>
                  )}
                  {/* 사용 여부 */}
                  {c.status === "redeemed" ? (
                    <span className="nb-tag bg-[#ff5d8f] text-white">사용됨 · {c.store?.name ?? "-"}</span>
                  ) : (
                    <span className="nb-tag bg-[#ffd23f]">미사용</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Funnel({
  label,
  value,
  sub,
  accent = "text-[#111]",
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="nb-card-sm p-3">
      <div className={`text-2xl font-extrabold ${accent}`}>{value}</div>
      <div className="text-xs font-bold text-slate-600">{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
