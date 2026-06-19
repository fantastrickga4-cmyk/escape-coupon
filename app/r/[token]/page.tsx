import { prisma } from "@/lib/db";
import AcceptForm from "./AcceptForm";

export const dynamic = "force-dynamic";

export default async function ReferralLanding({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const referral = await prisma.referral.findUnique({
    where: { id: token },
    include: { campaign: true },
  });

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fff7e0] p-6">
      <div className="w-full max-w-sm nb-card overflow-hidden">
        <div className="nb-banner text-center py-7 px-6">
          <p className="text-sm font-bold">친구 추천 혜택</p>
          <h1 className="text-2xl font-extrabold mt-1">
            {referral ? referral.campaign.benefit : "유효하지 않은 링크"}
          </h1>
        </div>
        <div className="p-6">
          {referral ? (
            <AcceptForm token={token} />
          ) : (
            <p className="text-center font-bold text-black">추천 링크가 만료되었거나 존재하지 않습니다.</p>
          )}
        </div>
      </div>
    </main>
  );
}
