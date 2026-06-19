"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { newToken } from "@/lib/coupon";
import { isAuthed } from "@/lib/auth";

// 추천인용 추천 링크 생성
export async function createReferral(_prev: unknown, formData: FormData) {
  if (!(await isAuthed("admin"))) return { error: "인증이 필요합니다." };

  const campaignId = String(formData.get("campaignId") ?? "");
  const referrerPhone = String(formData.get("referrerPhone") ?? "").replace(/[^0-9]/g, "");

  if (!campaignId) return { error: "추천 캠페인을 선택하세요." };
  if (referrerPhone.length < 9) return { error: "추천인 전화번호를 입력하세요." };

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.kind !== "referral") return { error: "추천 캠페인이 아닙니다." };

  await prisma.referral.create({
    data: { id: newToken(), campaignId, referrerPhone },
  });

  revalidatePath("/admin/refer");
  return { ok: true };
}
