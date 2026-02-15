import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    FOUNDER_MEET_LINK: process.env.FOUNDER_MEET_LINK || "",
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
