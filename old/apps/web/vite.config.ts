import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import viteTsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  server: {
    port: 3002,
  },
  plugins: [
    cloudflare({
      configPath: "./wrangler.toml",
      viteEnvironment: { name: "ssr" },
      persistState: true,
    }),
    viteTsconfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "app",
    }),
    react(),
    tailwindcss(),
  ],
})
