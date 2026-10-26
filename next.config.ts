import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The dev server is bound on 0.0.0.0; browsers open it as 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["unpdf", "pdfjs-dist", "mammoth", "xlsx"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
