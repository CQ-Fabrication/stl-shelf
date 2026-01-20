# Code Quality Standards

- Strict linting via oxlint (React, TypeScript, jsx-a11y plugins).
- No TypeScript enums; use const objects instead.
- Use `export type` for types and `import type` for type imports.
- Arrow functions are preferred over function declarations.
- Accessibility-first approach with strict a11y rules.
- Never use the `any` type; always use proper types.
- No unnecessary comments; code should be self-explanatory.
- No custom state when libraries provide it; check TanStack Form, Query, Router first.
- Use derived state over `useEffect`; prefer deriving state from props or params.
