import type { PrismaClient } from "@prisma/client";

/**
 * 取得 Prisma 實例：
 * - Cloudflare Edge Runtime → 使用 D1 adapter（由 getRequestContext 取得 DB）
 * - 本地開發 → 使用 SQLite（透過 DATABASE_URL）
 */
export async function getPrisma(): Promise<PrismaClient> {
  try {
    const { getRequestContext } = await import("@cloudflare/next-on-pages");
    const { PrismaD1 } = await import("@prisma/adapter-d1");
    const { PrismaClient } = await import("@prisma/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = getRequestContext().env as any;
    const adapter = new PrismaD1(env.DB);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  } catch {
    // 本地開發 fallback（SQLite）
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient({ log: ["error"] });
  }
}
