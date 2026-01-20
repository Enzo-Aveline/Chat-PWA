import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  output: "standalone",
  // Autres configs next si besoin
};

// On exporte la configuration "enveloppée" par withPWA
export default withPWA(nextConfig);
