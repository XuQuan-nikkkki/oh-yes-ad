import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [{
      source: "/brief-deliverables/:path*",
      destination: "/brief-work-items/:path*",
      permanent: true,
    }];
  },
};

export default nextConfig;
