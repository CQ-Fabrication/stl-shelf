# AGENTS.md

STL Shelf is a unified full-stack TypeScript app (TanStack Start) for managing a personal library of 3D printable models (STL, 3MF, OBJ).

Package manager: Bun.

Non-standard commands:
- `bun check-types` (tsgo typecheck)
- `bun check` (lint + format)

Global constraints:
- Never run formatters on the entire repository; only format files you modified.
- When using `bun check`, only focus on errors in files you changed.

More details:
- [Architecture](docs/agents/architecture.md)
- [Commands](docs/agents/commands.md)
- [Tech stack](docs/agents/tech-stack.md)
- [Engineering principles](docs/agents/principles.md)
- [Server patterns](docs/agents/server-patterns.md)
- [Frontend architecture](docs/agents/frontend.md)
- [Code quality standards](docs/agents/code-quality.md)
