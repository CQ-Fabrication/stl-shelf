# STL Shelf

A self-hosted web application for managing your personal library of 3D printable models. Built with modern TypeScript technologies and designed for makers who want to organize, version, and share their 3D designs.

## Features

- **Model Library Management**: Upload, organize, and browse your 3D models (STL, OBJ, 3MF, PLY)
- **Version Control**: Versions foreach uploaded model.
- **3D Preview**: Interactive 3D viewer for all supported model formats
- **Download Support**: Individual file downloads or ZIP archives for entire models
- **Self-Hosted**: Complete control over your data with Docker deployment

## Prerequisites

### Required Software

1. **Node.js & Bun**

   ```bash
   # Install Bun (includes Node.js)
   curl -fsSL https://bun.sh/install | bash
   ```

### Access the Application

- **Authenticated App**: [http://localhost:3001](http://localhost:3001) - Main application interface
- **Public Website**: [http://localhost:3002](http://localhost:3002) - Marketing/landing pages
- **API Server**: [http://localhost:3000](http://localhost:3000) - Backend API

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications for production
- `bun dev:server`: Start only the server (port 3000)
- `bun dev:app`: Start only the authenticated app (port 3001)
- `bun dev:web`: Start only the public website (port 3002)
- `bun check-types`: Run TypeScript type checking
- `bun check`: Run Biome linting and formatting

## Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Cloudflare Workers

```bash
# Deploy authenticated app
cd apps/app && bun deploy

# Deploy public website
cd apps/web && bun deploy

# Deploy server API
cd apps/server && bun deploy
```

## Configuration

### Environment Variables

TODO.

### Data Storage

TODO.

## Architecture

Built on the Better-T-Stack with:

- **Frontend**: React 19 + TanStack Router + TanStack Query + Vite
- **Backend**: Hono + oRPC for type-safe APIs
- **UI**: TailwindCSS v4 + shadcn/ui components
- **Type Safety**: End-to-end TypeScript with strict configuration
- **Storage**: Filesystem-based with Git versioning (no traditional database)
- **3D Rendering**: Three.js with React Three Fiber for model preview
