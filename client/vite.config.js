import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      injectManifest: {
        swSrc: "public/sw.js",
      },
      manifest: {
        name: "ExpenseFlow",
        short_name: "ExpenseFlow",
        description: "Smart Expense Tracker",
        start_url: "/",
        display: "standalone",
        background_color: "#05060B",
        theme_color: "#05060B",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/transactions") ||
              url.pathname.startsWith("/api/summary"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-expenseflow",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      includeAssets: ["offline.html", "manifest.json", "icons/icon-192.png", "icons/icon-512.png"],
      devOptions: { enabled: true },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
