# Server Task List

- [x] Remove legacy Git/LFS workflow from the API (gitService, git router, commit hooks) now that storage lives in Postgres + R2.
- [x] Harden auth middleware/session plumbing so protected routes require an active organization before hitting handlers.
- [ ] Fix cache invalidation to use organization IDs (e.g., updateModelMetadata currently passes session.user.id).
- [ ] Implement the model history endpoint and persistence so getModelHistory returns real data instead of an empty array.
- [ ] Abstract Redis/S3 clients to support Cloudflare Workers (no Bun.RedisClient/S3Client in worker runtime).
