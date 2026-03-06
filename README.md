<img src="https://cdn.stl-shelf.com/logo-dark.svg" alt="STL Shelf" width="280">

# STL Shelf

A simple home for all your 3D models. Organized, searchable, and finally under control.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg) ![Bun](https://img.shields.io/badge/runtime-Bun-black) ![TypeScript](https://img.shields.io/badge/lang-TypeScript-blue)

## Why STL Shelf?

Existing solutions were either too complex or too limited. Dropbox, Google Drive, or a NAS quickly become a mess of cryptic subfolders like `final_v2_REAL_final`.

STL Shelf does one thing: **organize your 3D models**. Nothing more, nothing less.

Use our [hosted version](https://stl-shelf.com) or self-host it on your own infrastructure.

Simple. Friendly. Built for makers.

## Features

- **Model Management** - Upload, organize, and version your 3D models (STL, 3MF, OBJ, PLY)
- **Interactive Preview** - Real-time 3D viewer powered by Three.js
- **Team Collaboration** - Organizations with role-based access control
- **Version History** - Track iterations of your designs
- **Tagging System** - Organize models with custom tags and categories
- **Bulk Downloads** - Download individual files or ZIP archives
- **Self-Hosted** - Your data stays on your infrastructure

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19, SSR)
- **Runtime**: [Bun](https://bun.sh)
- **Database**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- **Storage**: S3-compatible (Cloudflare R2, MinIO, AWS S3)
- **Auth**: [Better Auth](https://better-auth.com)
- **Styling**: TailwindCSS v4 + shadcn/ui
- **3D Rendering**: Three.js + React Three Fiber

## Requirements

- **Bun** >= 1.1
- **PostgreSQL** >= 14
- **S3-compatible storage** (R2, MinIO, S3)

## Self-Hosting

STL Shelf can be self-hosted on your own infrastructure.

For self-hosting prerequisites, required services, and deployment notes, see:

- [Self-Hosted Guide](https://stl-shelf.com/self-hosted-3d-model-library)
- [.env.example](./.env.example)

## Quick Start (Development)

### 1. Clone & Install

```bash
git clone https://github.com/CQ-Fabrication/stl-shelf.git
cd stl-shelf
bun install
```

### 2. Start Database & Storage (Docker)

```bash
docker compose up -d
```

This starts:

- **PostgreSQL** on port `5432`
- **MinIO** on port `9000` (API) and `9001` (Console)

### 3. Configure MinIO CORS (first time only)

```bash
docker exec stl-shelf-minio mc alias set local http://localhost:9000 stlshelf stlshelf_minio_dev_password
docker exec stl-shelf-minio mc admin config set local api cors_allow_origin="http://localhost:3000"
docker compose restart minio
```

### 4. Configure Environment

```bash
cp .env.example .env
```

### 5. Setup Database

```bash
bun run db:migrate
```

### 6. Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (user: `stlshelf`, password: `stlshelf_minio_dev_password`)

### 7. Optional: Start ngrok (public HTTPS for Polar webhooks)

```bash
bun run ngrok
```

Set these in `.env` when using ngrok:

- `NGROK_DOMAIN=yourname.ngrok-free.app`
- `NGROK_PORT=3000` (optional; defaults to `PORT` or `3000`)
- `AUTH_URL=https://yourname.ngrok-free.app`
- `WEB_URL=https://yourname.ngrok-free.app`

Polar webhook endpoint for local testing:

- `https://yourname.ngrok-free.app/api/auth/polar/webhooks`

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

Licensed under the [Apache License 2.0](LICENSE).

---

### Built by

<a href="https://cqfabrication.com">
    <img src="https://cdn.cqfabrication.com/logo.svg" alt="CQ Fabrication" width="160">
</a>
