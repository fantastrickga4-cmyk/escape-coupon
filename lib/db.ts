import { PrismaClient } from "@prisma/client";

// 개발 중 핫리로드로 커넥션이 여러 개 생기는 것을 방지하는 싱글톤
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
