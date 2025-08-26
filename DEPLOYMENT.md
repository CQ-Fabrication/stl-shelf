# STL Shelf Deployment Guide

## Docker Deployment (Recommended)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stl-shelf
   ```

2. **Create data directory**
   ```bash
   mkdir -p ./data
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Open your browser to `http://localhost:8080`

### Configuration

#### Environment Variables

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

Key configuration options:

- `DATA_DIR`: Directory where 3D models are stored (default: `/data`)
- `PORT`: Server port (default: `3000`)
- `GIT_USER_NAME`: Git commit author name
- `GIT_USER_EMAIL`: Git commit author email
- `GIT_REMOTE_URL`: Optional remote Git repository URL

#### Data Persistence

The `./data` directory is mounted into the container at `/data`. This is where:
- All 3D model files are stored
- Git repository is initialized
- Model metadata is kept

**Important**: Ensure the data directory has proper permissions:
```bash
chmod 755 ./data
```

### Docker Compose Configuration

The `docker-compose.yml` includes:

- **Port mapping**: `8080:3000` (host:container)
- **Volume mounts**: `./data:/data`
- **Health checks**: Automatic container health monitoring
- **Restart policy**: `unless-stopped`

### Git Integration

STL Shelf automatically:
1. Initializes a Git repository in `/data`
2. Configures Git LFS for 3D model files
3. Commits changes when models are uploaded/modified

#### Optional: Remote Git Repository

To sync with a remote repository:

1. Set `GIT_REMOTE_URL` in your environment
2. Ensure SSH keys are properly configured if using SSH URLs
3. The container will automatically push changes to the remote

## Manual Installation

### Prerequisites

- [Bun](https://bun.sh) runtime
- Git with Git LFS support
- Node.js 18+ (if not using Bun)

### Steps

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Build the applications**
   ```bash
   bun run build
   ```

3. **Set environment variables**
   ```bash
   export DATA_DIR=/path/to/your/models
   export PORT=3000
   ```

4. **Start the server**
   ```bash
   cd apps/server
   bun run start
   ```

## Directory Structure

```
data/
├── .git/                 # Git repository
├── .gitattributes        # Git LFS configuration
├── model-name-1/         # Model directory
│   ├── meta.json         # Model metadata
│   ├── v1/               # Version 1
│   │   ├── model.stl     # 3D files
│   │   ├── thumbnail.png # Optional thumbnail
│   │   └── meta.json     # Version metadata
│   └── v2/               # Version 2
│       └── ...
└── model-name-2/
    └── ...
```

## Backup and Migration

### Backup
Simply backup the entire `data/` directory:
```bash
tar -czf stl-shelf-backup.tar.gz ./data
```

### Migration
1. Stop the container
2. Copy your data directory to the new location
3. Update docker-compose.yml volume mounts
4. Restart

### Git Remote Sync
If configured with a remote repository, your models are automatically backed up to Git.

## Troubleshooting

### Container Won't Start
- Check port availability: `netstat -tlnp | grep 8080`
- Verify data directory permissions
- Check Docker logs: `docker-compose logs stl-shelf`

### Git Issues
- Ensure Git LFS is installed: `git lfs version`
- Check Git configuration in container logs
- Verify remote repository access (if configured)

### File Upload Issues
- Check data directory write permissions
- Verify available disk space
- Review file size limits (100MB per file by default)

## Performance Tuning

### Large Libraries
For libraries with 1000+ models:
- Consider using SSD storage
- Increase container memory if needed
- Monitor Git LFS bandwidth usage

### Network Configuration
- Use reverse proxy (nginx/Caddy) for SSL termination
- Configure proper CORS headers for external access
- Set up domain name and SSL certificate

## Security Considerations

- Run behind reverse proxy with authentication
- Restrict network access using Docker networks
- Regular backup of data directory
- Keep container images updated