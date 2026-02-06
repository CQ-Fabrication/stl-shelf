READ ~/CQ\ Fabrication/agent-scripts/AGENTS.MD BEFORE ANYTHING (skip if missing).

# AGENTS.md

STL Shelf is a unified full-stack TypeScript app (TanStack Start) for managing a personal library of 3D printable models (STL, 3MF, OBJ).

Package manager: Bun (`bun@1.3.5`). Use `bun` commands, not npm/yarn.

Non-standard commands:

- Dev server: `bun dev` (runs on port 3000)
- Lint: `bun lint` (oxlint --fix)
- Format: `bun format` (oxfmt --write .)
- Type check: `bun check-types` (tsgo)
- Lint/format checks: `bun check` (oxlint + oxfmt, no autofix)
- Build: `bun build` (do not run if the dev server is already running)
- Preview build: `bun preview`
- Production server: `bun start`
- Tests: `bun test` (vitest run)
- Ngrok tunnel (Polar webhooks): `bun run ngrok`
- Docs list: `bun docs:list`

Quality gate:

- Always run `bun check` and `bun check-types` before replying in the final message.

Database:

- PSQL connection: `psql "postgresql://stlshelf:stlshelf_dev_password@localhost:5432/stlshelf"`
- Drizzle commands: `bun db:generate`, `bun db:migrate`, `bun db:push`, `bun db:studio`, `bun db:seed`
- Seed data: `bun db:seed` (runs `drizzle/seeds/*.sql`)
- Docker services: `docker compose up -d`, `docker compose down`, `docker compose logs -f`

Maintenance scripts:

- `bun retention:sweep`
- `bun account-deletion:sweep`

Git:

- Always run git commands directly; never touch or create `.git/index.lock`.

If a command fails due to insufficient permissions, you must elevate the command to the user for approval.

UI/UX Redesigns:

- Preserve brand colors + fonts; don’t re-theme.
- Prefer task-based IA (Overview / Files / Versions / Print Profiles) to avoid deep scroll.
- Avoid redundant surfaces (no separate sheet if inline history exists).

More details:

- [Architecture](docs/agents/architecture.md)
- [Commands](docs/agents/commands.md)
- [Tech stack](docs/agents/tech-stack.md)
- [Engineering principles](docs/agents/principles.md)
- [Server patterns](docs/agents/server-patterns.md)
- [Frontend architecture](docs/agents/frontend.md)
- [Code quality standards](docs/agents/code-quality.md)
