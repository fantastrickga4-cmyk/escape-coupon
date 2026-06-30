"use server";

import { prisma } from "@/lib/db";
import { newToken, uniqueCode, couponUrl } from "@/lib/coupon";

// 친구(추천받은 사람)가 전화번호 입력 → 양측 쿠폰 발급
export async function acceptReferral(_prev: unknown, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const refereePhone = String(formData.get("phone") ?? "").replace(/[^0-9]/g, "");

  if (refereePhone.length < 9) return { error: "전화번호를 정확히 입력하세요." };

  const referral = await prisma.referral.findUnique({
    where: { id: token },
    include: { campaign: true },
  });
  if (!referral) return { error: "유효하지 않은 추천 링크입니다." };

  const { campaign } = referral;
  if (refereePhone === referral.referrerPhone) {
    return { error: "본인에게는 추천할 수 없습니다." };
  }

  // 친구(추천받은 사람) 쿠폰 — 캠페인 기본 혜택
  const refereeCoupon = await prisma.coupon.create({
    data: {
      id: newToken(),
      code: await uniqueCode(),
      campaignId: campaign.id,
      expiresAt: campaign.expiresAt,
      sentTo: refereePhone,
    },
  });

  // 추천인 보상 쿠폰 — referrerReward 혜택으로 덮어쓰기
  if (campaign.referrerReward) {
    await prisma.coupon.create({
      data: {
        id: newToken(),
        code: await uniqueCode(),
        campaignId: campaign.id,
        expiresAt: campaign.expiresAt,
        sentTo: referral.referrerPhone,
        benefitOverride: campaign.referrerReward,
      },
    });
  }

  await prisma.referral.update({
    where: { id: token },
    data: { refereeCount: { increment: 1 } },
  });

  return { ok: true, couponUrl: couponUrl(refereeCoupon.id), benefit: campaign.benefit };
}
