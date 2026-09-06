import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: [
    "@neondatabase/serverless",
    "@sparticuz/chromium",
    "googleapis",
    "openai",
    "playwright",
    "playwright-core",
    "puppeteer-core",
    "stripe",
  ],
  outputFileTracingIncludes: {
    "/api/**": [
      "./prompts/**",
      "./reports/styles/**",
      "./public/hero.jpg",
      "./public/cta-family.jpg",
      "./public/founder.jpg",
    ],
    "/admin/**": ["./prompts/**"],
  },
};

export default nextConfig;
