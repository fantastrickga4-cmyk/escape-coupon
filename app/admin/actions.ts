"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { newToken, newCodeBatch } from "@/lib/coupon";
import { ensureCoupon } from "@/lib/issue";
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

  // 미리 발급할 수량만큼 고유 토큰 + 짧은 코드 쿠폰 생성 (0이면 생성 안 함)
  // 코드 충돌(P2002)은 극히 드물지만, 발생 시 코드를 새로 뽑아 재시도한다.
  if (quantity > 0) {
    for (let attempt = 0; ; attempt++) {
      const codes = newCodeBatch(quantity);
      const coupons = Array.from({ length: quantity }, (_, i) => ({
        id: newToken(),
        code: codes[i],
        campaignId: campaign.id,
        expiresAt,
      }));
      try {
        await prisma.coupon.createMany({ data: coupons });
        break;
      } catch (e) {
        const isDup = (e as { code?: string })?.code === "P2002";
        if (isDup && attempt < 4) continue;
        throw e;
      }
    }
  }

  revalidatePath("/admin");
  redirect(`/admin/campaign/${campaign.id}`);
}

// 명단 한 줄에서 이름과 번호를 뽑는다.
// "홍길동 010-1234-5678", "010 1234 5678", "김 철수,01098765432" 모두 처리한다.
// 이름은 숫자·구분자를 걷어낸 나머지 — 번호가 앞에 오든 뒤에 오든 남는다.
function parseLine(line: string): { name: string | null; phone: string } | null {
  const phone = line.replace(/[^0-9]/g, "");
  if (phone.length < 9 || phone.length > 11) return null;
  const name = line
    .replace(/[0-9]/g, " ")
    .replace(/[-,;\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { name: name || null, phone };
}

export type AddResult = {
  error?: string;
  added?: number;
  skipped?: number;
  labels?: string[];
  invalid?: string[];
  campaignId?: string;
};

// 이미 만들어진 캠페인에 쿠폰을 더 발행한다.
// 혜택·유효기간·안내는 캠페인 것을 그대로 상속하므로 다시 입력받지 않는다.
export async function addCoupons(_prev: unknown, formData: FormData): Promise<AddResult> {
  if (!(await isAuthed("admin"))) return { error: "인증이 필요합니다." };

  const campaignId = String(formData.get("id") ?? "");
  const mode = String(formData.get("mode") ?? "list");
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: "캠페인을 찾을 수 없습니다." };

  // 수량만 추가 — 번호 없는 익명 쿠폰(링크 복사·현장 배포용)
  if (mode === "count") {
    const quantity = Math.max(0, Math.min(2000, Number(formData.get("quantity") ?? 0)));
    if (quantity === 0) return { error: "만들 수량을 입력하세요." };

    // 짧은 코드 충돌(P2002)은 드물지만, 나면 코드를 새로 뽑아 재시도한다.
    for (let attempt = 0; ; attempt++) {
      const codes = newCodeBatch(quantity);
      const rows = Array.from({ length: quantity }, (_, i) => ({
        id: newToken(),
        code: codes[i],
        campaignId,
        expiresAt: campaign.expiresAt,
      }));
      try {
        await prisma.coupon.createMany({ data: rows });
        break;
      } catch (e) {
        if ((e as { code?: string })?.code === "P2002" && attempt < 4) continue;
        throw e;
      }
    }
    revalidatePath(`/admin/campaign/${campaignId}`);
    revalidatePath("/admin");
    return { added: quantity, skipped: 0, labels: [], invalid: [], campaignId };
  }

  // 명단으로 추가 — 이름+번호
  const lines = String(formData.get("people") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "추가할 명단을 입력하세요." };
  if (lines.length > 300) return { error: "한 번에 최대 300줄까지 가능합니다." };

  const invalid: string[] = [];
  const targets = new Map<string, { name: string | null; phone: string }>();
  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      invalid.push(line);
      continue;
    }
    // 같은 번호가 두 줄에 나오면 한 명으로 (이름은 먼저 나온 값)
    if (!targets.has(parsed.phone)) targets.set(parsed.phone, parsed);
  }
  if (targets.size === 0) return { error: "유효한 전화번호가 없습니다.", invalid };

  let added = 0;
  let skipped = 0;
  const labels: string[] = [];
  for (const t of targets.values()) {
    const { created } = await ensureCoupon({
      campaignId,
      phone: t.phone,
      name: t.name,
      expiresAt: campaign.expiresAt,
    });
    if (created) {
      added++;
      labels.push(t.name ?? t.phone);
    } else {
      skipped++;
    }
  }

  revalidatePath(`/admin/campaign/${campaignId}`);
  revalidatePath("/admin");
  return { added, skipped, labels, invalid, campaignId };
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

// 발행된 쿠폰 유효기간 일괄 변경 — 캠페인 만료일과 소속 쿠폰 전체의 만료일을 함께 갱신
export async function updateExpiry(formData: FormData) {
  if (!(await isAuthed("admin"))) return;
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("expiresAt") ?? "").trim();
  if (!id) return;

  // 빈 값이면 무기한(null), 아니면 그 날짜 23:59:59까지 (캠페인 생성과 동일 규칙)
  const expiresAt = raw ? new Date(raw + "T23:59:59") : null;

  await prisma.$transaction([
    prisma.campaign.update({ where: { id }, data: { expiresAt } }),
    prisma.coupon.updateMany({ where: { campaignId: id }, data: { expiresAt } }),
  ]);

  revalidatePath(`/admin/campaign/${id}`);
  revalidatePath("/admin");
}

export async function deleteCampaign(formData: FormData) {
  if (!(await isAuthed("admin"))) return;
  const id = String(formData.get("id") ?? "");
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/admin");
  redirect("/admin");
}
