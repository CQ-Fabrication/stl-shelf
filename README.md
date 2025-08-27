# STL Shelf

A self-hosted web application for managing your personal library of 3D printable models. Built with modern TypeScript technologies and designed for makers who want to organize, version, and share their 3D designs.

## Features

- **Model Library Management**: Upload, organize, and browse your 3D models (STL, OBJ, 3MF, PLY)
- **Version Control**: Full Git-based version tracking with history for each model
- **3D Preview**: Interactive 3D viewer for all supported model formats
- **Metadata Management**: Rich metadata support with tags, print settings, and descriptions
- **Download Support**: Individual file downloads or ZIP archives for entire models
- **Git LFS Integration**: Efficient storage of large binary files with Git Large File Storage
- **Self-Hosted**: Complete control over your data with Docker deployment

## Prerequisites

### Required Software

1. **Node.js & Bun**
   ```bash
   # Install Bun (includes Node.js)
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Git LFS** (Required for handling large 3D model files)
   ```bash
   # macOS
   brew install git-lfs
   
   # Ubuntu/Debian
   sudo apt install git-lfs
   
   # CentOS/RHEL
   sudo yum install git-lfs
   
   # Windows
   # Download from https://git-lfs.github.io/
   ```

3. **Global Git LFS Setup** (One-time setup)
   ```bash
   git lfs install
   ```

### GitHub Integration (Optional)

To sync your 3D models to GitHub for backup and sharing:

1. **Create a GitHub Personal Access Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scope: `repo` (Full control of private repositories)
   - Copy the generated token

2. **Create a GitHub Repository**:
   - Create a new repository for your 3D models (can be private)
   - Don't initialize with README, .gitignore, or license (STL Shelf will handle this)

3. **Configure Environment Variables**:
   ```bash
   # Create .env file in the root directory
   cp .env.example .env
   
   # Add your GitHub credentials (replace YOUR_TOKEN with actual token)
   GIT_USER_NAME="Your Name"
   GIT_USER_EMAIL="your-email@example.com" 
   GIT_REMOTE_URL="https://YOUR_TOKEN@github.com/username/your-models-repo.git"
   ```

> **Note**: The setup script will automatically initialize Git LFS tracking when you first run the application.

## Getting Started

### Quick Setup (Automated)

Run the setup script to automatically configure everything:

```bash
# Clone the repository
git clone <your-repo-url>
cd stl-shelf

# Run automated setup
bun setup

# Start development server
bun dev
```

### Manual Setup

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Configure Environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Start Development Server**:
   ```bash
   bun dev
   ```

### Access the Application

- **Web Interface**: [http://localhost:3001](http://localhost:3001)
- **API Server**: [http://localhost:3000](http://localhost:3000)
- **API Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications for production
- `bun dev:web`: Start only the web application (port 3001)
- `bun dev:server`: Start only the server (port 3000)
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
# Deploy web application
cd apps/web && bun deploy

# Deploy server API
cd apps/server && bun deploy
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATA_DIR` | Directory for storing models | `./data` (dev), `/data` (prod) |
| `NODE_ENV` | Environment mode | `development` |
| `GIT_USER_NAME` | Git commit author name | `STL Shelf` |
| `GIT_USER_EMAIL` | Git commit author email | `stl-shelf@localhost` |
| `GIT_REMOTE_URL` | GitHub repository URL with token | - |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |

### Data Storage

- **Development**: Models stored in `./data` directory (ignored by main Git repo)
- **Production**: Models stored in `/data` directory or custom `DATA_DIR`
- **Git Repository**: Each data directory maintains its own Git repository with LFS support

## Architecture

Built on the Better-T-Stack with:

- **Frontend**: React 19 + TanStack Router + TanStack Query + Vite
- **Backend**: Hono + oRPC for type-safe APIs
- **UI**: TailwindCSS v4 + shadcn/ui components
- **Type Safety**: End-to-end TypeScript with strict configuration
- **Storage**: Filesystem-based with Git versioning (no traditional database)
- **3D Rendering**: Three.js with React Three Fiber for model preview

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

MIT License - see LICENSE file for details