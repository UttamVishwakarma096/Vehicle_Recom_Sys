import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/v1/auth": {
        target: "http://127.0.0.1:4001",
        changeOrigin: true,
      },
      "/api/v1/users": {
        target: "http://127.0.0.1:4001",
        changeOrigin: true,
      },
      "/api/v1/admin/vehicles": {
        target: "http://127.0.0.1:4002",
        changeOrigin: true,
      },
      "/api/v1/vehicles": {
        target: "http://127.0.0.1:4002",
        changeOrigin: true,
      },
      "/api/v1/recommendations": {
        target: "http://127.0.0.1:4003",
        changeOrigin: true,
      },
      "/api/v1/compare": {
        target: "http://127.0.0.1:4003",
        changeOrigin: true,
      },
      "/api/v1/favorites": {
        target: "http://127.0.0.1:4003",
        changeOrigin: true,
      },
      "/api/v1/longevity": {
        target: "http://127.0.0.1:4003",
        changeOrigin: true,
      },
      "/api/v1/ai": {
        target: "http://127.0.0.1:4003",
        changeOrigin: true,
      },
    },
  },
});
