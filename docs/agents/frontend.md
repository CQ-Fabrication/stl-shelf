# Frontend Guidelines

## Frontend Development

- Use TanStack Router for routing (file-based in `src/routes/`).
- Use TanStack Query for data fetching.
- Use server functions via `createServerFn`.
- Use UI components from shadcn/ui in `src/components/ui/`.
- Use Sonner toast notifications for global error handling.

## Frontend Architecture And Component Design

Components must follow clean architecture principles.

### Component Structure Rules

1. Separation of concerns: components handle UI rendering only.
   - Data fetching: custom hooks (`useModelData`, `useFileSelection`, etc.).
   - Business logic: pure utility functions in `lib/`.
   - Configuration: separate config files with `as const satisfies`.
   - Side effects: custom hooks with clear responsibilities.

2. Component size limits:
   - UI components should be under 150 lines.
   - If a component exceeds 150 lines, refactor it.
   - Each component should have one responsibility.

3. Custom hooks best practices:
   - Extract all business logic into custom hooks.
   - Hooks should be focused (`useModelFiles`, `useFileSelection`, `useZipDownload`).
   - No business logic in component bodies.
   - Hooks should return clean interfaces with descriptive names.

4. Pure functions for business logic:
   - All business logic should be testable pure functions.
   - Create `lib/` directories for domain-specific utilities.
   - Do not mix logic and UI concerns.

5. Configuration over code:
   - Use configuration objects for extensibility.
   - Use type-safe configs with `as const satisfies Record<K, V>`.
   - Add features by extending config entries.

### Anti-Patterns (Do Not Use)

- No data fetching in components; use hooks.
- No business logic in render functions; extract to utilities.
- No IIFE (immediately invoked function expressions); use named functions.
- No duplicate logic; extract shared utilities.
- No magic strings or numbers; use constants.
- No nested ternaries; use if/else or helper functions.
- No mixing concerns; keep data, logic, and UI separate.

### Example: Component Structure

```
/components/feature
  feature-component.tsx          # Pure UI (80-120 lines)

/hooks
  use-feature-data.ts            # Data fetching
  use-feature-logic.ts           # Business logic

/lib/feature
  config.ts                      # Configuration
  utils.ts                       # Pure utilities
  types.ts                       # Type definitions
```
