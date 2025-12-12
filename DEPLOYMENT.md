# STL Shelf - Cloudflare Deployment Guide

This guide covers deploying STL Shelf to Cloudflare with the following architecture:

| App | Domain | Service |
|-----|--------|---------|
| web | `stl-shelf.com` | Cloudflare Pages |
| app | `app.stl-shelf.com` | Cloudflare Pages |
| server | `api.stl-shelf.com` | Cloudflare Workers |

**Infrastructure:**
- **Storage**: Cloudflare R2 (S3-compatible)
- **Database**: Neon PostgreSQL via Hyperdrive
- **Access Control**: Zero Trust (pre-production)

---

## Prerequisites

- Cloudflare account with `stl-shelf.com` domain configured
- Wrangler CLI installed: `bun add -g wrangler`
- Authenticated with Cloudflare: `wrangler login`

---

## Phase 1: External Services Setup

### 1.1 Neon PostgreSQL

1. Create account at https://neon.tech
2. Create new project: `stl-shelf-production`
3. Copy the **pooled connection string** (required for Hyperdrive)
   - Format: `postgres://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Run migrations against Neon:
   ```bash
   cd apps/server
   DATABASE_URL="<neon-pooled-url>" bun run db:push
   ```

### 1.2 Cloudflare R2 Buckets

1. Go to Cloudflare Dashboard → R2
2. Create bucket:
   - `stl-models` - All model storage (models, thumbnails, temp files)
3. Generate R2 API credentials:
   - Go to R2 → Manage R2 API Tokens
   - Create token with read/write access to the bucket
   - Save Access Key ID and Secret Access Key

### 1.3 Hyperdrive Configuration

1. Go to Cloudflare Dashboard → Workers & Pages → Hyperdrive
2. Create new Hyperdrive config:
   - Name: `stl-shelf-db`
   - Connection string: Your Neon pooled URL
3. Copy the Hyperdrive ID (needed for wrangler.jsonc)

---

## Phase 2: Secrets Configuration

### Server Secrets (Workers)

```bash
cd apps/server

# Database (Hyperdrive handles this, but keep as fallback)
wrangler secret put DATABASE_URL

# Authentication
wrangler secret put AUTH_URL           # https://api.stl-shelf.com
wrangler secret put WEB_URL            # https://app.stl-shelf.com
wrangler secret put AUTH_COOKIE_DOMAIN # .stl-shelf.com

# Email (Resend)
wrangler secret put RESEND_API_KEY
wrangler secret put EMAIL_FROM         # STL Shelf <noreply@mail.stl-shelf.com>
wrangler secret put EMAIL_LOGO_URL

# Billing (Polar.sh)
wrangler secret put POLAR_ACCESS_TOKEN
wrangler secret put POLAR_WEBHOOK_SECRET

# CAPTCHA (Turnstile)
wrangler secret put TURNSTILE_SECRET_KEY

# OAuth (optional)
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# R2 Storage
wrangler secret put STORAGE_ACCESS_KEY
wrangler secret put STORAGE_SECRET_KEY
```

### App Environment Variables (Pages)

Set these in Cloudflare Dashboard → Pages → stl-shelf-app → Settings → Environment variables:

| Variable | Production Value |
|----------|------------------|
| `VITE_SERVER_URL` | `https://api.stl-shelf.com` |
| `VITE_TURNSTILE_SITE_KEY` | Your Turnstile site key |

---

## Phase 3: Deploy Applications

### 3.1 Deploy Server (Workers)

```bash
cd apps/server
wrangler deploy
```

### 3.2 Deploy App (Pages)

```bash
cd apps/app
bun run build
wrangler pages deploy dist --project-name=stl-shelf-app
```

### 3.3 Deploy Web (Pages)

```bash
cd apps/web
bun run build
wrangler pages deploy dist/client --project-name=stl-shelf-web
```

---

## Phase 4: DNS Configuration

In Cloudflare Dashboard → DNS:

| Type | Name | Target |
|------|------|--------|
| CNAME | `@` | `stl-shelf-web.pages.dev` |
| CNAME | `app` | `stl-shelf-app.pages.dev` |
| CNAME | `api` | `stl-shelf-api.<account>.workers.dev` |

Enable Cloudflare proxy (orange cloud) for all records.

---

## Phase 5: Zero Trust (Pre-Production)

To restrict access during testing:

1. Go to Cloudflare Dashboard → Zero Trust → Access → Applications
2. Create new application:
   - Name: `STL Shelf Pre-Production`
   - Type: Self-hosted
   - Application domain: `*.stl-shelf.com`
3. Add policy:
   - Name: `Allowed Testers`
   - Action: Allow
   - Include: Emails ending in `@your-domain.com` (or specific emails)
4. Create bypass rule for webhooks:
   - Path: `/api/auth/*/webhook/*`
   - Action: Bypass

**Remove Zero Trust when ready for public launch.**

---

## Phase 6: External Service Updates

### Polar.sh Webhooks

1. Go to Polar Dashboard → Settings → Webhooks
2. Update webhook URL: `https://api.stl-shelf.com/api/auth/polar/webhook`
3. Test webhook delivery

### OAuth Providers

**GitHub:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Update callback URL: `https://api.stl-shelf.com/api/auth/callback/github`

**Google:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Update authorized redirect URI: `https://api.stl-shelf.com/api/auth/callback/google`

### Cloudflare Turnstile

1. Go to Cloudflare Dashboard → Turnstile
2. Add production domain: `app.stl-shelf.com`

### Resend

1. Verify sending domain: `mail.stl-shelf.com`
2. Add DNS records as instructed by Resend

---

## Environment Variables Reference

### Server (apps/server)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `AUTH_URL` | Auth server URL | `https://api.stl-shelf.com` |
| `WEB_URL` | Frontend URL | `https://app.stl-shelf.com` |
| `AUTH_COOKIE_DOMAIN` | Cookie domain | `.stl-shelf.com` |
| `CORS_ORIGIN` | Allowed origins | `https://app.stl-shelf.com` |
| `DATABASE_URL` | Postgres URL | Via Hyperdrive |
| `STORAGE_REGION` | R2 region | `auto` |
| `STORAGE_ENDPOINT` | R2 endpoint | `<account>.r2.cloudflarestorage.com` |
| `STORAGE_ACCESS_KEY` | R2 access key | From R2 API tokens |
| `STORAGE_SECRET_KEY` | R2 secret key | From R2 API tokens |
| `STORAGE_BUCKET_NAME` | Storage bucket | `stl-models` |
| `RESEND_API_KEY` | Resend API key | `re_...` |
| `EMAIL_FROM` | Sender address | `STL Shelf <noreply@mail.stl-shelf.com>` |
| `TURNSTILE_SECRET_KEY` | Turnstile secret | From Turnstile dashboard |
| `POLAR_ACCESS_TOKEN` | Polar API token | From Polar dashboard |
| `POLAR_WEBHOOK_SECRET` | Polar webhook secret | From Polar webhooks |
| `POLAR_SERVER` | Polar environment | `production` |

### App (apps/app)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SERVER_URL` | API URL | `https://api.stl-shelf.com` |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile public key | From Turnstile dashboard |

---

## Troubleshooting

### Workers Deployment Fails

```bash
# Check wrangler config
wrangler whoami
wrangler deploy --dry-run
```

### Database Connection Issues

- Ensure using **pooled** connection string from Neon
- Check Hyperdrive is properly configured
- Verify DATABASE_URL secret is set

### R2 Access Denied

- Verify R2 API token has correct permissions
- Check bucket names match wrangler.jsonc bindings
- Ensure STORAGE_ENDPOINT uses correct account ID

### CORS Errors

- Check `CORS_ORIGIN` matches frontend domain exactly
- Ensure `AUTH_COOKIE_DOMAIN` is set to `.stl-shelf.com`

---

## Monitoring

- **Workers Analytics**: Cloudflare Dashboard → Workers → Analytics
- **R2 Metrics**: Cloudflare Dashboard → R2 → Metrics
- **Real-time Logs**: `wrangler tail` (requires deployment)
