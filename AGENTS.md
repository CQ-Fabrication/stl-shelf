# Repository Guidelines

This guide summarizes how to contribute safely and efficiently to the `stl-shelf` monorepo. Consult `RULES.md` for the authoritative policies referenced here.

## Project Structure & Module Organization

The codebase splits into `apps/web` (React 19 + Vite client) and `apps/server` (Bun + Hono API backed by Drizzle/PostgreSQL). Shared assets live in `assets/`, operational docs in `docs/`. Tooling and configuration sit at the root (`turbo.json`, `biome.json`, `bunfig.toml`). Keep new modules within their app boundary; cross-app sharing should go through published interfaces or shared packages.

## Build, Test, and Development Commands

Run `bun run dev` for the full Turbo pipeline, or scope to `bun run dev:web` / `bun run dev:server`. Build all targets with `bun run build`, and run static analysis via `bun run check-types` and `bun run check`. Database workflows live in the server workspace: `bun run -F server db:generate`, `db:migrate`, and `db:studio`. Start the API with Docker when needed using `bun run -F server dev:docker` (leverages `docker-compose.development.yml`).

## Coding Style & Naming Conventions

Write strict TypeScript—no `any`—and let Biome enforce 2-space indentation, single quotes, and configured trailing commas. Follow naming patterns: `kebab-case` filenames (`apps/web/src/routes/stl-viewer.tsx`), `camelCase` for functions/variables, and `PascalCase` for React components and types. Uphold accessibility guidelines: semantic elements first, always include `type` on `<button>`, and ensure interactive handlers are keyboard-accessible.

Avoid comments that restate what the code already expresses; only add comments when they convey important context or rationale that the implementation cannot make obvious.

## Testing Guidelines

No global runner exists yet. When you add coverage, place specs under `apps/*/src/**/*.{test,spec}.ts(x)` and favor Bun's built-in test APIs plus Testing Library for UI. Keep tests deterministic by mocking network and database calls; document new fixtures in `docs/`.

## Commit & Pull Request Guidelines

Write short, imperative commit subjects (e.g., `Add STL viewer UI`) and mention issues with `#123` when applicable. Pull requests should describe changes, link issues, supply screenshots for UI adjustments, and note database migrations. Ensure build, type-check, and lint tasks pass before requesting review.

## Security & Configurationcd  Tips

Never commit secrets. Derive local env files from `apps/*/.env.example`, and prefer Docker compose for local services. Run schema changes through the provided `db:*` scripts and commit resulting Drizzle artifacts. Respect module boundaries to avoid coupling across apps.
