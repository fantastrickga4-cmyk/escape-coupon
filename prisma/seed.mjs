import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const STORES = [
  { id: 1, name: "1호점" },
  { id: 2, name: "2호점" },
  { id: 3, name: "3호점" },
];

for (const s of STORES) {
  await prisma.store.upsert({ where: { id: s.id }, update: { name: s.name }, create: s });
}
console.log("매장 시드 완료:", STORES.map((s) => s.name).join(", "));

// 기존 쿠폰에 직원 수동입력용 짧은 코드 백필 (code 없는 것만, 멱등)
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O·1/I/L 제외
const code6 = () =>
  Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
const need = await prisma.coupon.findMany({ where: { code: null }, select: { id: true } });
if (need.length) {
  const existing = await prisma.coupon.findMany({
    where: { NOT: { code: null } },
    select: { code: true },
  });
  const used = new Set(existing.map((c) => c.code));
  for (const c of need) {
    let code;
    do {
      code = code6();
    } while (used.has(code));
    used.add(code);
    await prisma.coupon.update({ where: { id: c.id }, data: { code } });
  }
  console.log(`쿠폰 코드 백필 완료: ${need.length}건`);
}

await prisma.$disconnect();
