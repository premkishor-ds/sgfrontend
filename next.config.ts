import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000",
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.9.118'],
};

export default nextConfig;
