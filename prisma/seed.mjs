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
await prisma.$disconnect();
