import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function createProxy(target, serviceName) {
  return {
    target,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on("error", (err, req) => {
        console.warn(
          `[Vite Proxy Error] ${req.method} ${req.url} -> ${target} (${serviceName}): ${err.message}`
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/v1/auth": createProxy("http://127.0.0.1:4001", "Identity Service"),
      "/api/v1/users": createProxy("http://127.0.0.1:4001", "Identity Service"),
      "/api/v1/admin/users": createProxy("http://127.0.0.1:4001", "Identity Service"),
      "/api/v1/admin/vehicles": createProxy("http://127.0.0.1:4002", "Vehicle Catalog Service"),
      "/api/v1/vehicles": createProxy("http://127.0.0.1:4002", "Vehicle Catalog Service"),
      "/api/v1/recommendations": createProxy("http://127.0.0.1:4003", "Recommendation Service"),
      "/api/v1/compare": createProxy("http://127.0.0.1:4003", "Recommendation Service"),
      "/api/v1/favorites": createProxy("http://127.0.0.1:4003", "Recommendation Service"),
      "/api/v1/longevity": createProxy("http://127.0.0.1:4003", "Recommendation Service"),
      "/api/v1/ai": createProxy("http://127.0.0.1:4003", "Recommendation Service"),
    },
  },
});
