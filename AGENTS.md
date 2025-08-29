# Repository Guidelines

For the complete code, accessibility, and TypeScript rules, see RULES.md.

## Project Structure & Module Organization
- `apps/web`: React 19 + Vite client (Tailwind, TanStack Router/Query).
- `apps/server`: Bun + Hono API (Drizzle ORM, PostgreSQL, file storage).
- `assets/`: Static assets and seeds. `docs/`: product/dev docs. `config/`: infra/config files. `scripts/`: helper scripts.
- Tooling: `turbo.json` (monorepo tasks), `biome.json` (lint/format via Ultracite), `bunfig.toml`.

## Build, Test, and Development Commands
- Root dev: `bun run dev` (Turbo pipeline). Focused: `bun run dev:web`, `bun run dev:server`.
- Build: `bun run build` (all apps). Type checks: `bun run check-types`.
- Lint/format: `bun run check` (Biome fix), `bun x ultracite format` (staged files via lint-staged/Husky).
- Server DB: `bun run -w server db:generate|db:migrate|db:studio`.
- Docker dev API: `bun run -w server dev:docker` (uses `docker-compose.development.yml`).

## Coding Style & Naming Conventions
- TypeScript everywhere; strict, no `any`. Follow Biome/Ultracite rules.
- Indentation: 2 spaces; single quotes; trailing commas as configured by Biome.
- Naming: `camelCase` for vars/functions, `PascalCase` for React components/types, `kebab-case` filenames (e.g., `stl-viewer.tsx`).
- Accessibility: follow a11y guardrails; prefer semantic HTML and include `type` on buttons.

## Testing Guidelines
- No test runner is configured yet. If adding tests:
  - Place files as `apps/*/src/**/*.{test,spec}.ts(x)`.
  - Prefer Vitest + Testing Library (web) and lightweight unit tests (server).
  - Keep tests fast, deterministic; mock network/DB. Document any fixtures in `docs/`.

## Commit & Pull Request Guidelines
- Commits: short, imperative summaries (e.g., `Add STL viewer UI`), optional body for context; reference issues (`#123`).
- PRs: include description, linked issue, screenshots for UI changes, and migration notes when touching DB. Ensure checks pass (build, types, lint).
- Keep diffs focused; update docs and `.env.example` when config changes.

## Security & Configuration Tips
- Never commit secrets. Copy `apps/*/.env.example` to `.env` locally. Use Docker compose for local services.
- Run migrations via server `db:*` scripts; commit SQL/Drizzle artifacts.
- Follow existing module boundaries; avoid cross-app imports outside published interfaces.
