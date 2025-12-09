# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STL Shelf is a self-hosted application for managing a personal library of 3D printable models (STL, 3MF, OBJ). It's built as a modern TypeScript monorepo using the Better-T-Stack.

## Architecture

This is a Turborepo monorepo with three main applications:

- **Server** (`apps/server/`): Hono-based API with oRPC for type-safe endpoints, designed to run on Cloudflare Workers
- **App** (`apps/app/`): Authenticated React application using TanStack Router, TanStack Query, and Vite, with shadcn/ui components
- **Web** (`apps/web/`): Public-facing marketing website (to be created)

## Development Commands

### Primary Commands (run from root)

- `bun install` - Install all dependencies
- `bun dev` - Start all applications in development (server: 3000, app: 3001, web: 3002)
- `bun build` - Build all applications
- `bun check-types` - Type check across all apps
- `bun check` - Run Biome linting and formatting

### Individual App Commands

- `bun dev:server` - Start only server application (port 3000)
- `bun dev:app` - Start only authenticated app (port 3001)
- `bun dev:web` - Start only public website (port 3002)

### App-Specific Commands

**Server** (`cd apps/server`):

- `bun dev` - Start server (port 3000)
- `bun dev:webhooks` - Start server with ngrok tunnel for webhook testing (see WEBHOOK_TESTING.md)
- `bun ngrok` - Start only ngrok tunnel
- `bun build` - Dry-run deployment build
- `bun deploy` - Deploy to Cloudflare Workers
- `bun compile` - Build standalone binary

**App** (`cd apps/app`):

- `bun dev` - Start authenticated app Vite dev server (port 3001)
- `bun build` - Build for production
- `bun deploy` - Build and deploy via Wrangler

**Web** (`cd apps/web`):

- `bun dev` - Start public website Vite dev server (port 3002)
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

### BEFORE WRITING ANY CODE, ASK

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

- Use TanStack Router for routing (file-based in `apps/app/src/routes/`)
- Use TanStack Query via oRPC utils for data fetching (`orpc` from `apps/app/src/utils/orpc.ts`)
- UI components from shadcn/ui in `apps/app/src/components/ui/`
- Global error handling via Sonner toast notifications

### Frontend Architecture & Component Design

**CRITICAL: Components MUST follow clean architecture principles**

#### Component Structure Rules

1. **Separation of Concerns** - Components should ONLY handle UI rendering
   - Data fetching → Custom hooks (`useModelData`, `useFileSelection`, etc.)
   - Business logic → Pure utility functions in `lib/` directory
   - Configuration → Separate config files with `as const satisfies`
   - Side effects → Custom hooks with clear responsibilities

2. **Component Size Limits**
   - UI components should be **< 150 lines** maximum
   - If component exceeds 150 lines, it's doing too much - REFACTOR
   - Each component should have ONE responsibility

3. **Custom Hooks Best Practices**
   - Extract ALL business logic into custom hooks
   - Hooks should be focused: `useModelFiles`, `useFileSelection`, `useZipDownload`
   - NO business logic in component bodies
   - Hooks should return clean interfaces with descriptive names

4. **Pure Functions for Business Logic**
   - ALL business logic should be testable pure functions
   - Create `lib/` directories for domain-specific utilities
   - Example: `lib/slicers/utils.ts` for slicer-related logic
   - NO mixing of logic and UI concerns

5. **Configuration Over Code**
   - Use configuration objects for extensibility
   - Example: `SLICER_CONFIG` object instead of switch statements
   - Type-safe configs with `as const satisfies Record<K, V>`
   - Easy to add new features by adding config entries

#### Anti-Patterns - NEVER DO THESE

- ❌ **NO data fetching in components** - Use hooks
- ❌ **NO business logic in render functions** - Extract to utilities
- ❌ **NO IIFE (Immediately Invoked Function Expressions)** - Use named functions
- ❌ **NO duplicate logic** - Extract to shared utilities
- ❌ **NO magic strings/numbers** - Use constants
- ❌ **NO nested ternaries** - Use if/else or helper functions
- ❌ **NO mixing concerns** - Data/logic/UI should be separate layers

#### Refactoring Checklist

Before marking any component complete, verify:

1. ✅ Component only contains UI rendering logic
2. ✅ All data fetching is in custom hooks
3. ✅ All business logic is in pure functions
4. ✅ Configuration is in separate config files
5. ✅ Component is < 150 lines
6. ✅ Each piece is testable in isolation
7. ✅ NO duplicate code exists
8. ✅ Follows Single Responsibility Principle

#### Example: Good Component Structure

```
/components/feature
  feature-component.tsx          // Pure UI (80-120 lines)

/hooks
  use-feature-data.ts            // Data fetching
  use-feature-logic.ts           // Business logic

/lib/feature
  config.ts                      // Configuration
  utils.ts                       // Pure utilities
  types.ts                       // Type definitions
```

**Remember: If Dan Abramov wouldn't approve it, don't ship it.**

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
