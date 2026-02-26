# Self-hosted 3D model library for private archives

Canonical: https://stl-shelf.com/self-hosted-3d-model-library

Run STL Shelf on your own infrastructure with Docker.
Keep your STL, 3MF, OBJ, and PLY files on your server with a clean, private library.
No sharing, no social, no marketplace.

## Deployment pillars

- Docker-only: run the app, database, and storage in containers for a clean stack.
- PostgreSQL required: reliable metadata and version history with a real database.
- Your files stay local: no sharing or social feed.

## What STL Shelf is / is not

### STL Shelf is

- Docker-first deployment for private archives.
- PostgreSQL-backed metadata and version history.
- A private library for STL, 3MF, OBJ, and PLY files.

### STL Shelf is not

- Not a marketplace.
- Not a social feed.
- Not an import/sync connector for external services.

## Requirements

- Docker and Docker Compose
- PostgreSQL database (container or external)
- S3-compatible storage (MinIO, R2, S3)

## FAQ

### Can I self-host without Docker?

No. STL Shelf is designed to run via Docker to support PostgreSQL and future Redis requirements.

### Does self-hosting include sharing or public links?

No. STL Shelf is a private archive for your files only.

### Can I import from other services?

No. You upload and manage your own files only.

### Which file types are supported?

STL, 3MF, OBJ, and PLY are supported.

## Related links

- [Organize STL files](https://stl-shelf.com/organize-stl-files.md)
- [Private 3D model library](https://stl-shelf.com/private-3d-model-library.md)
- [Pricing](https://stl-shelf.com/pricing.md)
- [About](https://stl-shelf.com/about.md)
