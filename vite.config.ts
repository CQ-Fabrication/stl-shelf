import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { configDefaults } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json" with { type: "json" };

// Git worktrees (e.g. .claude/worktrees/*) have no node_modules of their own,
// so deps resolve from the main checkout — outside Vite's fs.allow list. The
// TanStack Start default client entry (virtual:tanstack-start-client-entry)
// resolves to a file inside @tanstack/react-start and must be explicitly
// allowed, or dev-server requests for it fall through to the SSR catch-all.
const reactStartDir = path.dirname(
  createRequire(import.meta.url).resolve("@tanstack/react-start/package.json"),
);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: "jsdom",
    // Nested agent worktrees carry their own copies of every test file
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
  server: {
    port: 3000,
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.io"],
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), reactStartDir],
    },
  },
  plugins: [
    tailwindcss(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
  ],
});
