# STL Shelf

A self-hosted web application for managing your personal library of 3D printable models. Built with modern TypeScript technologies and designed for makers who want to organize, version, and share their 3D designs.

## Features

- **Model Library Management**: Upload, organize, and browse your 3D models (STL, OBJ, 3MF, PLY)
- **Version Control**: Versions for each uploaded model
- **3D Preview**: Interactive 3D viewer for STL and OBJ formats
- **Download Support**: Individual file downloads or ZIP archives for entire models
- **Self-Hosted**: Complete control over your data with Docker deployment

## Self-Hosting Guide

### Prerequisites

1. **Docker & Docker Compose**
   ```bash
   # macOS
   brew install --cask docker

   # Or install Docker Desktop from https://docker.com
   ```

2. **Bun** (for development)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/stl-shelf.git
   cd stl-shelf
   ```

2. **Start the database services**
   ```bash
   docker compose up -d
   ```

   This starts:
   - **PostgreSQL** on port `5432` - Database
   - **MinIO** on port `9000` (API) and `9001` (Console) - Object storage

3. **Configure CORS for MinIO** (required for 3D viewer)
   ```bash
   # Run once after first start
   docker exec stl-shelf-minio mc alias set local http://localhost:9000 stlshelf stlshelf_minio_dev_password
   docker exec stl-shelf-minio mc admin config set local api cors_allow_origin="http://localhost:3000"
   docker compose restart minio
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Install dependencies and run migrations**
   ```bash
   bun install
   bun db:migrate
   ```

6. **Start the application**
   ```bash
   bun dev
   ```

7. **Access the application**
   - **App**: [http://localhost:3000](http://localhost:3000)
   - **MinIO Console**: [http://localhost:9001](http://localhost:9001) (user: `stlshelf`, password: `stlshelf_minio_dev_password`)

### Docker Services

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart minio
```

### Data Persistence

All data is stored in Docker volumes:
- `stl-shelf_postgres_data` - Database
- `stl-shelf_minio_data` - Uploaded files

To backup your data:
```bash
# Backup PostgreSQL
docker exec stl-shelf-postgres pg_dump -U stlshelf stlshelf > backup.sql

# Backup MinIO (copy the volume)
docker run --rm -v stl-shelf_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz /data
```

## Development

### Available Scripts

- `bun dev` - Start development server (port 3000)
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun db:generate` - Generate database migrations
- `bun db:migrate` - Run database migrations
- `bun db:studio` - Open Drizzle Studio (database GUI)
- `bun check` - Run linting and formatting
- `bun check-types` - Run TypeScript type checking

## Architecture

Built with TanStack Start (unified full-stack React):

- **Framework**: TanStack Start + TanStack Router + TanStack Query
- **Backend**: Server Functions with Drizzle ORM
- **Database**: PostgreSQL
- **Storage**: S3-compatible (MinIO for development, Cloudflare R2 for production)
- **Auth**: Better Auth
- **UI**: TailwindCSS v4 + shadcn/ui
- **3D Rendering**: Three.js with React Three Fiber
