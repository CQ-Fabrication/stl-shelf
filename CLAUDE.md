# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STL Shelf is an application for managing a personal library of 3D printable models (STL, 3MF, OBJ). It's built as a unified full-stack TypeScript application using TanStack Start.

## Architecture

This is a **TanStack Start** unified application:

```
src/
├── routes/                    # File-based routing (TanStack Router)
│   ├── __root.tsx             # Root layout
│   ├── api/                   # API routes
│   │   └── auth/$.ts          # Better Auth handler
│   ├── organization/          # Organization routes
│   ├── checkout/              # Checkout routes
│   └── *.tsx                  # Page routes
├── server/                    # Server-side code
│   ├── functions/             # Server functions (createServerFn)
│   │   ├── models.ts          # Model CRUD operations
│   │   └── billing.ts         # Billing operations
│   ├── services/              # Business logic services
│   │   ├── models/            # Model-related services
│   │   ├── tags/              # Tag services
│   │   ├── billing/           # Polar/billing services
│   │   └── storage.ts         # R2 storage service
│   └── middleware/
│       └── auth.ts            # Auth middleware
├── components/                # React components
│   ├── ui/                    # shadcn/ui components
│   ├── models/                # Model-related components
│   ├── model-detail/          # Model detail page components
│   ├── billing/               # Billing components
│   └── *.tsx                  # Shared components
├── hooks/                     # Custom React hooks
├── lib/                       # Core libraries
│   ├── db/                    # Drizzle ORM
│   │   ├── index.ts           # Database client
│   │   └── schema/            # Database schema
│   │       ├── auth.ts        # Better Auth tables
│   │       ├── models.ts      # Model/file/tag tables
│   │       └── api-keys.ts    # API key tables
│   ├── auth.ts                # Better Auth configuration
│   ├── email/                 # Email templates (React Email)
│   ├── billing/               # Billing config and utilities
│   └── *.ts                   # Utility modules
├── stores/                    # State management (TanStack Store)
└── utils/                     # Utility functions
```

## Development Commands

### Primary Commands (run from root)

- `bun install` - Install dependencies
- `bun dev` - Start development server (port 3000)
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun start` - Start production server

### Database Commands

- `bun db:generate` - Generate Drizzle migrations
- `bun db:migrate` - Run migrations
- `bun db:push` - Push schema changes (dev)
- `bun db:studio` - Open Drizzle Studio

### Code Quality

- `bun lint` - Run oxlint with auto-fix
- `bun format` - Format code with oxfmt
- `bun check` - Lint + format check
- `bun check-types` - Type check with tsgo (10x faster than tsc)
- `bun test` - Run tests with Vitest
- **CRITICAL: NEVER run formatters on the entire repository** - Only format files you've modified
- **When using `bun check`, only focus on errors in files YOU changed** - Ignore existing issues

## Technology Stack

### Core Technologies

- **Runtime**: Bun (package manager and runtime)
- **Framework**: TanStack Start (full-stack React)
- **Routing**: TanStack Router (file-based)
- **Data Fetching**: TanStack Query + Server Functions
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth with `tanstackStartCookies` plugin
- **Styling**: TailwindCSS v4 + shadcn/ui
- **Storage**: Cloudflare R2
- **Billing**: Polar.sh

### Development Tools

- **Type Checking**: tsgo (TypeScript 7 native - 10x faster)
- **Linting**: oxlint (50-100x faster than ESLint)
- **Formatting**: oxfmt (30x faster than Prettier)
- **Git Hooks**: Husky + lint-staged
- **Testing**: Vitest + Testing Library

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

### FOLLOW THE DOCUMENTATION

- **ALWAYS check library documentation FIRST** before implementing anything
- **Use libraries as intended** - No hacky workarounds
- **If it doesn't work out-of-the-box, YOU are doing it wrong**
- Context7 MCP is available for up-to-date documentation

### BEFORE WRITING ANY CODE, ASK

- What's the actual problem?
- What's the scale? (10 items? 10,000? 10 million?)
- What are the performance implications?
- Has someone already solved this properly?
- What will actually happen when this runs with real data?

**ENGINEERING, NOT CODING MONKEY BULLSHIT**

## Key Patterns

### Server Functions

```typescript
// src/server/functions/models.ts
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export const listModels = createServerFn({ method: 'GET' })
  .validator(schema)
  .handler(async ({ data }) => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    // ... business logic
  })
```

### API Routes (for auth, webhooks)

```typescript
// src/routes/api/auth/$.ts
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { auth } from '@/lib/auth'

export const APIRoute = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
})
```

### Frontend Development

- Use TanStack Router for routing (file-based in `src/routes/`)
- Use TanStack Query for data fetching
- Use server functions via `createServerFn`
- UI components from shadcn/ui in `src/components/ui/`
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
   - NO mixing of logic and UI concerns

5. **Configuration Over Code**
   - Use configuration objects for extensibility
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

### Code Quality Standards

- Strict linting via oxlint (React, TypeScript, jsx-a11y plugins)
- No TypeScript enums, use const objects instead
- Use `export type` for types, `import type` for type imports
- Arrow functions preferred over function declarations
- Accessibility-first approach with strict a11y rules
- **NEVER use `any` type** - No exceptions. Always use proper types
- **NO unnecessary comments** - Code must be self-explanatory
- **NO custom state when libraries provide it** - Check TanStack Form, Query, Router first
- **Use derived state over useEffect** - Prefer deriving state directly from props/params
