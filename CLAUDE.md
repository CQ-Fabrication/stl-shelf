# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STL Shelf is a self-hosted application for managing a personal library of 3D printable models (STL, 3MF, OBJ). It's built as a modern TypeScript monorepo using the Better-T-Stack with filesystem-based storage, Git versioning, and optional GitHub sync.

## Architecture

This is a Turborepo monorepo with two main applications:
- **Server** (`apps/server/`): Hono-based API with oRPC for type-safe endpoints, designed to run on Cloudflare Workers
- **Web** (`apps/web/`): React frontend using TanStack Router, TanStack Query, and Vite, with shadcn/ui components

The architecture follows a filesystem-first approach where all 3D models and metadata are stored as files, versioned with Git (using LFS for binaries), rather than using a traditional database.

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

## Key Patterns

### API Development
- All API routes use oRPC procedures defined in `apps/server/src/routers/`
- Use `publicProcedure` from `apps/server/src/lib/orpc.ts` for new endpoints
- Context is available but minimal (no auth yet)
- Server exports types that are imported by web app for type safety

### Frontend Development
- Use TanStack Router for routing (file-based in `apps/web/src/routes/`)
- Use TanStack Query via oRPC utils for data fetching (`orpc` from `apps/web/src/utils/orpc.ts`)
- UI components from shadcn/ui in `apps/web/src/components/ui/`
- Global error handling via Sonner toast notifications

### File Structure Conventions
- Follow filesystem-first approach for 3D model storage
- Models organized by version (v1, v2, etc.) in directories
- Metadata stored as `meta.json` files alongside models
- Git LFS used for tracking binary files (.stl, .3mf, .obj)

### Code Quality Standards
- Extremely strict code quality via Ultracite rules (see AGENTS.md)
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

## Environment Setup

### Development
- Server runs on port 3000, web on port 3001
- Environment variables in `.env` files (see `.env.example` if available)
- Uses Wrangler for local development (matches Cloudflare Workers environment)

### Production
- Both apps deploy to Cloudflare Workers
- Web app serves static assets, server provides API
- Filesystem data mounted as persistent volume in production Docker setup

## Testing

No specific testing framework configured yet. When adding tests:
- Check for existing test patterns in the codebase first
- Follow the project's package manager (Bun) for test runner setup
- Ensure tests follow Ultracite quality rules

## Project Goals (from PRD)

This application is designed to be:
- Lightweight and filesystem-based (no traditional database)
- Git-versioned for full model history and backup
- Self-hosted via Docker with LAN access
- Modern and fast with sub-second performance targets
- Type-safe across the entire stack