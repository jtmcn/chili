import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321");

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: supabase.protocol.replace(":", "") as "http" | "https",
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: "/storage/v1/object/public/chili-photos/**",
      },
    ],
    // Photos are replaced under new paths, so long caching is safe.
    minimumCacheTTL: 2678400,
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withBotId(nextConfig);
