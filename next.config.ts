import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    FOUNDER_MEET_LINK: process.env.FOUNDER_MEET_LINK || "",
  },
};

export default nextConfig;
