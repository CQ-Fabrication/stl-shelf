import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), tanstackRouter({}), react(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "#assets": path.resolve(__dirname, "../../assets"),
      // Force zod to resolve to v4.1.8 to fix @hookform/resolvers zod/v4/core import
      zod: path.resolve(
        __dirname,
        "../../node_modules/.bun/zod@4.1.8/node_modules/zod"
      ),
    },
  },
});
