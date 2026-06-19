"use server";

import { redirect } from "next/navigation";
import { setSession, clearSession } from "@/lib/auth";

export async function staffLogin(_prev: unknown, formData: FormData) {
  const storeId = Number(formData.get("storeId") ?? 0);
  if (![1, 2, 3].includes(storeId)) return { error: "호점을 선택하세요." };
  await setSession("staff", undefined, storeId);
  redirect("/staff");
}

export async function staffLogout() {
  await clearSession("staff");
  redirect("/staff/login");
}
