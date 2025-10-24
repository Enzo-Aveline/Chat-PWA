import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});
module.exports = withPWA({
  /* next config */
});

const nextConfig: NextConfig = {
  output: "standalone", // ⬅️ Ajoutez ceci pour optimiser le déploiement
};

export default nextConfig;
