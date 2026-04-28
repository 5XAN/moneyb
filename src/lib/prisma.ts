import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPrisma(): Promise<PrismaClient> {
  if (process.env.CF_PAGES || process.env.NODE_ENV === "production") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { getRequestContext } = await import("@cloudflare/next-on-pages") as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { PrismaD1 } = await import("@prisma/adapter-d1") as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = getRequestContext().env as any;
      const adapter = new PrismaD1(env.DB);
      return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
    } catch {
      return prisma;
    }
  }
  return prisma;
}
