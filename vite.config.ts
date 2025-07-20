import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import history from "connect-history-api-fallback"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/lib": path.resolve(__dirname, "lib"),
      "@/components": path.resolve(__dirname, "components"),
      "@/hooks": path.resolve(__dirname, "hooks"),
      "@/styles": path.resolve(__dirname, "styles"),
    },
  },
  define: {
    global: "globalThis",
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
      "/notifications": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
      "/notifications": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
})
