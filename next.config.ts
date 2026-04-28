import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 需要此設定
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/.prisma/**/*"],
  },
};

export default nextConfig;
