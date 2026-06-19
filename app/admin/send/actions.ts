"use server";

import { prisma } from "@/lib/db";
import { newToken, couponUrl } from "@/lib/coupon";
import { isAuthed } from "@/lib/auth";

export type SendRow = { phone: string; token: string; link: string; message: string };
export type SendResult = { error?: string; greeting?: string; rows?: SendRow[] };

// "010-1234-5678", "01012345678", 줄바꿈/쉼표/공백 혼합 입력을 번호 배열로 정리
function parsePhones(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((p) => p.replace(/[^0-9]/g, ""))
    .filter((p) => p.length >= 9 && p.length <= 11);
  return Array.from(new Set(parts)); // 중복 제거
}

export async function prepareBatch(_prev: unknown, formData: FormData): Promise<SendResult> {
  if (!(await isAuthed("admin"))) return { error: "인증이 필요합니다." };

  const campaignId = String(formData.get("campaignId") ?? "");
  const greeting = String(formData.get("greeting") ?? "").trim();
  const excludeTheme = String(formData.get("excludeTheme") ?? "").trim() || null;
  const phones = parsePhones(String(formData.get("phones") ?? ""));

  if (!campaignId) return { error: "캠페인을 선택하세요." };
  if (phones.length === 0) return { error: "유효한 전화번호가 없습니다." };
  if (phones.length > 100) return { error: "한 번에 최대 100개까지 가능합니다." };

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: "캠페인을 찾을 수 없습니다." };

  const rows: SendRow[] = [];
  for (const phone of phones) {
    // 이미 이 번호로 발송된 미사용 쿠폰이 있으면 재사용(중복 발급 방지), 없으면 새로 발급
    let coupon = await prisma.coupon.findFirst({
      where: { campaignId, sentTo: phone, status: "issued", excludeTheme },
    });
    if (!coupon) {
      coupon = await prisma.coupon.create({
        data: { id: newToken(), campaignId, expiresAt: campaign.expiresAt, sentTo: phone, excludeTheme },
      });
    }
    const link = couponUrl(coupon.id);
    const message = `${greeting ? greeting + "\n\n" : ""}${campaign.benefit} 쿠폰이 도착했어요!\n${link}`;
    rows.push({ phone, token: coupon.id, link, message });
  }

  return { greeting, rows };
}
