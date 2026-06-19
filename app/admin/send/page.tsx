import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import BatchSender from "./BatchSender";

export const dynamic = "force-dynamic";

export default async function SendPage() {
  await requireAuth("admin");
  const [campaigns, themes] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, benefit: true },
    }),
    prisma.theme.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return (
    <main className="min-h-screen bg-[#fff7e0] p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <Link href="/admin" className="text-sm font-bold text-slate-700 hover:text-black">
          ← 대시보드
        </Link>
        <header>
          <h1 className="text-2xl font-extrabold text-black">문자로 쿠폰 보내기</h1>
          <p className="text-sm text-slate-600 mt-1">
            번호를 붙여넣으면 각자 전용 쿠폰이 만들어집니다. 버튼을 탭해 내 폰으로 발송하세요 (문자
            무제한 요금제면 무료).
          </p>
        </header>

        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-600">
            먼저 <Link href="/admin" className="underline">대시보드</Link>에서 캠페인을 만들어주세요.
          </p>
        ) : (
          <BatchSender campaigns={campaigns} themes={themes.map((t) => t.name)} />
        )}
      </div>
    </main>
  );
}
