# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STL Shelf is a self-hosted application for managing a personal library of 3D printable models (STL, 3MF, OBJ). It's built as a modern TypeScript monorepo using the Better-T-Stack.

## Architecture

This is a Turborepo monorepo with two main applications:

- **Server** (`apps/server/`): Hono-based API with oRPC for type-safe endpoints, designed to run on Cloudflare Workers
- **Web** (`apps/web/`): React frontend using TanStack Router, TanStack Query, and Vite, with shadcn/ui components

## Development Commands

### Primary Commands (run from root)

- `bun install` - Install all dependencies
- `bun dev` - Start both server (port 3000) and web (port 3001) in development
- `bun build` - Build all applications
- `bun check-types` - Type check across all apps
- `bun check` - Run Biome linting and formatting

### Individual App Commands

- `bun dev:web` - Start only web application (port 3001)
- `bun dev:server` - Start only server application (port 3000)

### App-Specific Commands

**Server** (`cd apps/server`):

- `bun dev` - Start server with Wrangler (port 3000)
- `bun build` - Dry-run deployment build
- `bun deploy` - Deploy to Cloudflare Workers
- `bun compile` - Build standalone binary

**Web** (`cd apps/web`):

- `bun dev` - Start Vite dev server (port 3001)
- `bun build` - Build for production
- `bun deploy` - Build and deploy via Wrangler

### Code Quality

- `bun x ultracite format` - Format code (used by lint-staged)
- Code follows strict Ultracite rules (see AGENTS.md for detailed guidelines)
- **CRITICAL: NEVER run formatters or linters on the entire repository** - Only format/lint files you've actually modified
- **When using `bun check`, only focus on errors in files YOU changed** - Ignore existing issues in other files

## Technology Stack

### Core Technologies

- **Runtime**: Bun (package manager and runtime)
- **Backend**: Hono + oRPC for type-safe APIs
- **Frontend**: React 19 + TanStack Router + TanStack Query
- **Styling**: TailwindCSS v4 + shadcn/ui components
- **Deployment**: Cloudflare Workers (both apps can deploy)

### Type Safety & API

- **oRPC**: Provides end-to-end type safety between server and client
- **Client setup**: Uses `@orpc/tanstack-query` for React Query integration
- **Server context**: Minimal context setup (no auth configured yet)
- **API types**: Exported from server to web app for type safety

### Development Tools

- **Monorepo**: Turborepo for build orchestration
- **Linting/Formatting**: Biome + Ultracite (extremely strict rules)
- **Git Hooks**: Husky + lint-staged for pre-commit formatting
- **TypeScript**: Strict configuration across all apps

## CRITICAL ENGINEERING PRINCIPLES - NEVER VIOLATE THESE

### DON'T BE A SOCIOPATH
**PUSH BACK when something is wrong** - Don't just agree and implement bad ideas:
- If a requirement doesn't make sense, SAY SO
- If there's a better approach, PROPOSE IT
- If something will break at scale, WARN ABOUT IT
- If the user is asking for something problematic, EXPLAIN WHY
- Have actual engineering opinions, not just "yes sir" compliance

### THINK BEFORE CODING
1. **Understand the complete picture** before writing a single line of code
2. **Test with REAL DATA** - Don't assume it works, actually test with real-world data at scale
3. **Consider SCALE** - Is it 10 items or 10 million? Performance implications matter
4. **NO BULLSHIT** - No fake "great job" validation. Be honest about problems and limitations
5. **Research FIRST** - Check if this is a solved problem before reinventing broken wheels
6. **Admit uncertainty** - If you don't know, say so. Don't deliver broken shit with confidence
7. **SIMPLE > CLEVER** - Start with something that actually works, not something that looks smart

### LESSON FROM STL PREVIEW FAILURE
- **Never implement rendering/processing without considering data scale**
- STL files have thousands/millions of triangles, not dozens
- Server-side 3D rendering without GPU is COMPLEX - use proven solutions or skip it
- Test IMMEDIATELY with real files, not theoretical assumptions
- A broken "solution" is worse than no solution

### BEFORE WRITING ANY CODE, ASK:
- What's the actual problem?
- What's the scale? (10 items? 10,000? 10 million?)
- What are the performance implications?
- Has someone already solved this properly?
- What will actually happen when this runs with real data?

**ENGINEERING, NOT CODING MONKEY BULLSHIT**

## Key Patterns

### API Development

- All API routes use oRPC procedures defined in `apps/server/src/routers/`
- Use `publicProcedure` from `apps/server/src/lib/orpc.ts` for new public endpoints.
- Use `protectedProcedure` from `apps/server/src/lib/orpc.ts` for new private endpoints.
- Context is available but minimal
- Server exports types that are imported by web app for type safety

### Frontend Development

- Use TanStack Router for routing (file-based in `apps/web/src/routes/`)
- Use TanStack Query via oRPC utils for data fetching (`orpc` from `apps/web/src/utils/orpc.ts`)
- UI components from shadcn/ui in `apps/web/src/components/ui/`
- Global error handling via Sonner toast notifications

### Code Quality Standards

- Extremely strict code quality via Ultracite rules (see RULES.md)
- No TypeScript enums, use const objects instead
- Use `export type` for types, `import type` for type imports
- Arrow functions preferred over function declarations
- Accessibility-first approach with strict a11y rules
- **NEVER use `any` type** - No exceptions. Always use proper types
- **NO unnecessary comments** - Code must be self-explanatory. Only add comments when they provide additional value
- **NO custom state when libraries provide it** - ALWAYS check if the library (especially TanStack Form) already handles the functionality before adding custom state
- **ALWAYS use library features properly** - Check documentation via Context7 FIRST before implementing custom solutions
- **NO shortcuts or workarounds** - Use libraries the proper way as intended by their documentation
- **Use derived state over useEffect** - Prefer deriving state directly from props/params rather than using useEffect for synchronization. This reduces errors and makes code more predictable
- **NEVER commit without user approval** - ALWAYS wait for the user's explicit approval before committing any changes. The user must review and approve the work first
