# STL Shelf Deployment Guide

Deploy STL Shelf as a self-hosted Bun application with PostgreSQL.

## Prerequisites

- [ ] Server with Bun installed (VPS, Docker, etc.)
- [ ] PostgreSQL database (PlanetScale, Neon, or self-hosted)
- [ ] S3-compatible storage (Cloudflare R2, MinIO, AWS S3)
- [ ] Domain with SSL (optional but recommended)

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_URL` | Full URL for auth (e.g., `https://stl-shelf.com`) |
| `WEB_URL` | Full URL for web app (e.g., `https://stl-shelf.com`) |
| `BETTER_AUTH_SECRET` | 32+ character secret for auth |
| `STORAGE_ENDPOINT` | S3-compatible storage endpoint |
| `STORAGE_ACCESS_KEY` | Storage access key |
| `STORAGE_SECRET_KEY` | Storage secret key |
| `STORAGE_BUCKET_NAME` | Bucket name (default: `stl-models`) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `RESEND_API_KEY` | Resend API key for emails |
| `STATSIG_SERVER_SECRET` | Statsig server secret |
| `POLAR_ACCESS_TOKEN` | Polar.sh access token |
| `POLAR_WEBHOOK_SECRET` | Polar.sh webhook secret |

### Optional

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `BETTERSTACK_SOURCE_TOKEN` | Better Stack logging token |
| `VITE_STATSIG_CLIENT_KEY` | Statsig client key (client-side) |
| `POSTGRES_MAX_CONNECTIONS` | Max DB connections (default: 20) |
| `PORT` | Server port (default: 3000) |

## Build & Run

### Local Build

```bash
# Install dependencies
bun install

# Build for production
bun run build

# Start production server
bun run start
```

### Production Commands

```bash
# Build
bun run build

# Start (runs .output/server/index.mjs with Bun)
bun run start
```

## Deployment Options

### Option 1: Docker (Recommended)

```dockerfile
FROM oven/bun:1.3

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN bun run build

# Expose port
EXPOSE 3000

# Start
CMD ["bun", ".output/server/index.mjs"]
```

```yaml
# docker-compose.yml
services:
  stl-shelf:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

### Option 2: Systemd Service

```ini
# /etc/systemd/system/stl-shelf.service
[Unit]
Description=STL Shelf
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/stl-shelf
ExecStart=/usr/local/bin/bun .output/server/index.mjs
Restart=on-failure
EnvironmentFile=/opt/stl-shelf/.env.production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable stl-shelf
sudo systemctl start stl-shelf
```

### Option 3: PM2

```bash
# Install PM2
bun add -g pm2

# Start with PM2
pm2 start .output/server/index.mjs --name stl-shelf --interpreter bun

# Save PM2 config
pm2 save
pm2 startup
```

## Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name stl-shelf.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stl-shelf.com;

    ssl_certificate /etc/letsencrypt/live/stl-shelf.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stl-shelf.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Setup

### Run Migrations

```bash
# Generate migrations (if schema changed)
bun run db:generate

# Apply migrations
bun run db:migrate

# Or push schema directly (dev only)
bun run db:push
```

### Connection Pooling

For production, configure connection pooling:

```bash
# In .env.production
DATABASE_URL=postgresql://user:pass@host:5432/db
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30
POSTGRES_CONNECTION_TIMEOUT=5
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl -I https://stl-shelf.com
```

### 2. Verify Endpoints

- [ ] Homepage loads: `https://stl-shelf.com`
- [ ] Auth works: `https://stl-shelf.com/login`
- [ ] API responds: `https://stl-shelf.com/api/auth/session`

### 3. Test Critical Flows

- [ ] User registration
- [ ] Email verification
- [ ] Model upload to storage
- [ ] Model download/preview
- [ ] Billing webhooks (Polar.sh)

## Troubleshooting

### Database Connection Errors

1. Verify `DATABASE_URL` is correct
2. Check firewall allows connection to DB port
3. Verify SSL mode if required (`?sslmode=require`)

### Storage Upload Failures

1. Verify storage credentials
2. Check bucket exists and is accessible
3. Verify CORS configuration on bucket

### Auth Issues

1. Ensure `AUTH_URL` and `WEB_URL` match your domain
2. Verify `BETTER_AUTH_SECRET` is set
3. Check cookie domain settings

### Build Failures

```bash
# Clean build
rm -rf .output node_modules/.vite
bun install
bun run build
```

## Updates & Rollback

### Update Process

```bash
# Pull latest code
git pull

# Install dependencies
bun install

# Run migrations
bun run db:migrate

# Build
bun run build

# Restart service
sudo systemctl restart stl-shelf
# or: pm2 restart stl-shelf
```

### Rollback

```bash
# Checkout previous version
git checkout <previous-tag-or-commit>

# Rebuild
bun install
bun run build

# Restart
sudo systemctl restart stl-shelf
```

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] `BETTER_AUTH_SECRET` is unique and secure (32+ chars)
- [ ] HTTPS enforced via reverse proxy
- [ ] Database credentials are not exposed
- [ ] Firewall configured (only expose 80/443)
- [ ] Turnstile enabled for forms
- [ ] Regular security updates applied

## Cost Estimate (Self-Hosted)

| Resource | Provider | Cost |
|----------|----------|------|
| VPS (2GB RAM) | Hetzner/DigitalOcean | ~€5-10/mo |
| PostgreSQL | PlanetScale/Neon | ~€5-19/mo |
| S3 Storage | Cloudflare R2 | Free tier / ~€0.015/GB |
| Domain + SSL | Cloudflare | Free |

**Total: ~€10-30/mo** (vs Cloudflare Workers which scales with requests)
