"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function addTheme(formData: FormData) {
  if (!(await isAuthed("admin"))) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.theme.upsert({ where: { name }, update: {}, create: { name } });
  revalidatePath("/admin/themes");
}

export async function deleteTheme(formData: FormData) {
  if (!(await isAuthed("admin"))) return;
  const id = Number(formData.get("id"));
  await prisma.theme.delete({ where: { id } });
  revalidatePath("/admin/themes");
}
