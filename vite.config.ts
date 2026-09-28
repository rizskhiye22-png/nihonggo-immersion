import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Saat `npm run dev`, panggilan /api diteruskan ke `wrangler pages dev` (port 8788)
    proxy: { "/api": "http://127.0.0.1:8788" },
  },
});
