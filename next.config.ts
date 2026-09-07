import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1MB; ritningar/PDF-bilagor behöver mer utrymme.
    serverActions: { bodySizeLimit: "15mb" },
  },
};

export default nextConfig;
