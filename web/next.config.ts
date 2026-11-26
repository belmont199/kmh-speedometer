import type { NextConfig } from "next";

// Served from https://belmont199.github.io/kmh-speedometer/ as static files.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/kmh-speedometer",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
