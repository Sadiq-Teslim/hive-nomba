import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dashboard talks to the Hive API. In dev we proxy /api to the backend so
// there are no CORS surprises and the same relative paths work in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
