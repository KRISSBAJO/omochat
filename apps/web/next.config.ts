import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot
};

export default nextConfig;
