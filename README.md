# STL Shelf

Self-hosted 3D model library for makers and print farms.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bun](https://img.shields.io/badge/runtime-Bun-black)
![TypeScript](https://img.shields.io/badge/lang-TypeScript-blue)

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

## Quick Start (Development)

### 1. Clone & Install

```bash
git clone https://github.com/cq-fabrication/stl-shelf.git
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

## Production Deployment

### Build & Run

```bash
bun run build
bun run start
```

### Docker

```dockerfile
FROM oven/bun:1.3

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
```

```yaml
# docker-compose.prod.yml
services:
  stl-shelf:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name stl-shelf.example.com;

    ssl_certificate /etc/letsencrypt/live/stl-shelf.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stl-shelf.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_URL` | Auth callback URL |
| `WEB_URL` | Public web URL |
| `BETTER_AUTH_SECRET` | Auth secret (32+ chars) |
| `STORAGE_ENDPOINT` | S3-compatible endpoint |
| `STORAGE_ACCESS_KEY` | Storage access key |
| `STORAGE_SECRET_KEY` | Storage secret key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `RESEND_API_KEY` | Resend API key for emails |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `STORAGE_BUCKET_NAME` | S3 bucket name | `stl-models` |
| `STORAGE_REGION` | S3 region | `auto` |
| `POSTGRES_MAX_CONNECTIONS` | Max DB connections | `20` |
| `GITHUB_CLIENT_ID` | GitHub OAuth | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | - |
| `GOOGLE_CLIENT_ID` | Google OAuth | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | - |

## Development Commands

```bash
bun dev          # Start dev server
bun build        # Production build
bun start        # Start production server
bun test         # Run tests
bun lint         # Lint code
bun format       # Format code
bun check-types  # Type check
```

### Database

```bash
bun db:generate  # Generate migrations
bun db:migrate   # Run migrations
bun db:push      # Push schema (dev)
bun db:studio    # Open Drizzle Studio
```

### Docker Services

```bash
docker compose up -d      # Start services
docker compose down       # Stop services
docker compose logs -f    # View logs
```

## Project Structure

```
src/
├── routes/          # File-based routing
├── server/          # Server functions & services
│   ├── functions/   # TanStack Server Functions
│   └── services/    # Business logic
├── components/      # React components
│   └── ui/          # shadcn/ui components
├── hooks/           # Custom React hooks
├── lib/             # Core libraries
│   ├── db/          # Drizzle schema
│   └── auth.ts      # Auth config
└── stores/          # State management
```

## Data Backup

```bash
# Backup PostgreSQL
docker exec stl-shelf-postgres pg_dump -U stlshelf stlshelf > backup.sql

# Backup MinIO
docker run --rm -v stl-shelf_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz /data
```

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with care by [CQ Fabrication](https://cq-fabrication.com)
