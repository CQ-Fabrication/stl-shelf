# Server Task List

- [x] Remove legacy Git/LFS workflow from the API (gitService, git router, commit hooks) now that storage lives in Postgres + R2.
- [x] Harden auth middleware/session plumbing so protected routes require an active organization before hitting handlers.
- [x] Integrate Scalar-powered API documentation for Hono (see <https://hono.dev/examples/scalar>).
