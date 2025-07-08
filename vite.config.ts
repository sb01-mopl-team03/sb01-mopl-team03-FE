import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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
  // ========== SPRING BOOT PROXY DISABLED FOR FRONTEND-ONLY TESTING ==========
  // Uncomment the server configuration below when you want to connect to Spring Boot backend
  /*
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Spring Boot 서버
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true, // WebSocket 지원
      }
    }
  },
  */
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
