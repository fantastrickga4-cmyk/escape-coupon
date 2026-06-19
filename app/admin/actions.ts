"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { newToken } from "@/lib/coupon";
import { checkPassword, setSession, clearSession, isAuthed } from "@/lib/auth";

export async function adminLogin(_prev: unknown, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword("admin", password)) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }
  await setSession("admin", password);
  redirect("/admin");
}

export async function adminLogout() {
  await clearSession("admin");
  redirect("/admin/login");
}

export async function createCampaign(_prev: unknown, formData: FormData) {
  if (!(await isAuthed("admin"))) return { error: "인증이 필요합니다." };

  const name = String(formData.get("name") ?? "").trim();
  const benefit = String(formData.get("benefit") ?? "").trim();
  const kind = String(formData.get("kind") ?? "normal");
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  const quantity = Math.max(0, Math.min(2000, Number(formData.get("quantity") ?? 0)));

  if (!name || !benefit) return { error: "캠페인명과 혜택 내용을 입력하세요." };

  const expiresAt = expiresRaw ? new Date(expiresRaw + "T23:59:59") : null;

  // 사용 조건 (요일·시간·인원)
  const days = formData.getAll("days").map(String).filter(Boolean);
  const validDays = days.length > 0 ? days.join(",") : null;
  const fromRaw = formData.get("fromHour");
  const toRaw = formData.get("toHour");
  const validFromHour = fromRaw !== null && String(fromRaw) !== "" ? Number(fromRaw) : null;
  const validToHour = toRaw !== null && String(toRaw) !== "" ? Number(toRaw) : null;
  const minPeople = Math.max(1, Math.min(50, Number(formData.get("minPeople") ?? 1)));

  const reviewUrl = kind === "review" ? String(formData.get("reviewUrl") ?? "").trim() || null : null;
  const referrerReward = kind === "referral" ? String(formData.get("referrerReward") ?? "").trim() || null : null;

  const campaign = await prisma.campaign.create({
    data: {
      name,
      benefit,
      kind,
      expiresAt,
      validDays,
      validFromHour,
      validToHour,
      minPeople,
      reviewUrl,
      referrerReward,
    },
  });

  // 미리 발급할 수량만큼 고유 토큰 쿠폰 생성 (0이면 생성 안 함)
  if (quantity > 0) {
    const coupons = Array.from({ length: quantity }, () => ({
      id: newToken(),
      campaignId: campaign.id,
      expiresAt,
    }));
    await prisma.coupon.createMany({ data: coupons });
  }

  revalidatePath("/admin");
  redirect(`/admin/campaign/${campaign.id}`);
}

// 기능10: 사용 취소(되돌리기) — 잘못 처리한 쿠폰을 미사용 상태로 복구
export async function cancelRedemption(formData: FormData) {
  if (!(await isAuthed("admin"))) return;
  const id = String(formData.get("id") ?? "");
  const coupon = await prisma.coupon.findUnique({ where: { id }, include: { campaign: true } });
  if (!coupon || coupon.status !== "redeemed") return;

  await prisma.coupon.update({
    where: { id },
    data: {
      status: "issued",
      redeemedAt: null,
      storeId: null,
      redeemedTheme: null,
      redeemedPeople: null,
    },
  });
  await prisma.log.create({
    data: {
      type: "cancel",
      storeId: coupon.storeId,
      detail: `${coupon.benefitOverride ?? coupon.campaign.benefit} 사용 취소`,
    },
  });
  revalidatePath("/admin");
}

export async function deleteCampaign(formData: FormData) {
  if (!(await isAuthed("admin"))) return;
  const id = String(formData.get("id") ?? "");
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/admin");
  redirect("/admin");
}
