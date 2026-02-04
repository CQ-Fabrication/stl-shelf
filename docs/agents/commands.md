# Commands

## Primary (run from repo root)

- `bun install` - Install dependencies
- `bun dev` - Start development server (port 3000)
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun start` - Start production server

## Database

- `bun db:generate` - Generate Drizzle migrations
- `bun db:migrate` - Run migrations
- `bun db:push` - Push schema changes (dev)
- `bun db:studio` - Open Drizzle Studio

## Code Quality

- `bun lint` - Run oxlint with auto-fix
- `bun format` - Format code with oxfmt
- `bun check` - Lint + format check
- `bun check-types` - Type check with tsgo
- `bun test` - Run tests with Vitest

Constraints:

- Never run formatters on the entire repository; only format files you modified.
- When using `bun check`, only focus on errors in files you changed.
