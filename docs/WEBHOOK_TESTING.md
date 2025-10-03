# Webhook Testing Guide

This guide explains how to test Polar webhooks during local development using ngrok.

## Prerequisites

1. **Install ngrok**

   ```bash
   # macOS
   brew install ngrok

   # Linux
   snap install ngrok

   # Windows
   choco install ngrok
   ```

2. **Sign up for ngrok** (optional but recommended for persistent URLs)
   - Go to <https://ngrok.com/>
   - Create a free account
   - Get your auth token from the dashboard
   - Configure it: `ngrok config add-authtoken YOUR_TOKEN`

## Quick Start

Start ngrok tunnel and dev server separately:

**Terminal 1** - Start ngrok:

```bash
cd apps/server
bun run ngrok
```

**Terminal 2** - Start dev server:

```bash
cd apps/server
bun run dev
```

The ngrok script will:

- Create an ngrok tunnel to port 3000
- Display the public URL for webhooks
- Save the URL to `.ngrok-url` file

## Configure Polar Webhooks

Once ngrok is running, you'll see output like:

```
✓ Ngrok tunnel started!

  Public URL:  https://abc123.ngrok.io
  Local:       http://localhost:3000
  Dashboard:   http://localhost:4040

Configure Polar webhook:
  1. Go to: https://polar.sh/dashboard/[your-org]/settings/webhooks
  2. Add endpoint: https://abc123.ngrok.io/api/auth/webhook/polar
  3. Copy webhook secret to .env as POLAR_WEBHOOK_SECRET
```

### Steps

1. **Copy your ngrok URL** from the output above

2. **Go to Polar Dashboard**
   - Navigate to: <https://polar.sh/dashboard/[your-org]/settings/webhooks>
   - Click "Add Webhook Endpoint"

3. **Configure the webhook**
   - **URL**: `https://YOUR_NGROK_URL/api/auth/webhook/polar`
   - **Format**: Raw (default)
   - **Events**: Select the events you want to receive:
     - `order.paid` - When a subscription is purchased/renewed
     - `subscription.created` - When a new subscription is created
     - `subscription.canceled` - When a subscription is canceled
     - `subscription.revoked` - When a subscription ends/is revoked
     - `customer.state_changed` - Comprehensive state sync

4. **Copy the webhook secret**
   - After creating the webhook, Polar will show you a webhook secret
   - Copy it and add to `apps/server/.env`:

     ```bash
     POLAR_WEBHOOK_SECRET=whsec_your_secret_here
     ```

5. **Restart the server** if it's already running to load the new secret

## Testing Webhooks

### 1. Test Webhook Delivery

In the Polar dashboard, you can send test events:

- Go to your webhook endpoint settings
- Click "Send Test Event"
- Select an event type
- Check your server logs to see the webhook received

### 2. Monitor Webhooks

**Ngrok Dashboard**: <http://localhost:4040>

- View all incoming requests
- Inspect webhook payloads
- Replay requests for debugging

**Server Logs**: Watch your terminal running `dev`

- You'll see `[Polar Webhook]` messages when webhooks are processed
- Check for any errors in processing

### 3. Test Real Flows

1. **Test Subscription Upgrade**:
   - Go to <http://localhost:3001/billing>
   - Click "Upgrade" on Basic or Pro tier
   - Complete checkout (use Polar test mode)
   - Watch webhook arrive and update organization tier

2. **Test Subscription Cancellation**:
   - In Polar dashboard, cancel a test subscription
   - Watch webhook arrive and mark subscription as canceled

## Troubleshooting

### Ngrok URL Changes

Free ngrok URLs change every time you restart ngrok. You'll need to:

1. Update the webhook URL in Polar dashboard
2. Or upgrade to ngrok paid plan for static URLs

### Webhook Not Received

1. **Check ngrok is running**: Visit <http://localhost:4040>
2. **Check webhook URL**: Make sure it includes `/api/auth/webhook/polar`
3. **Check server logs**: Look for errors in webhook processing
4. **Verify webhook secret**: Make sure `POLAR_WEBHOOK_SECRET` matches Polar

### Signature Verification Fails

- Ensure `POLAR_WEBHOOK_SECRET` in `.env` matches the secret in Polar dashboard
- Restart server after updating the secret
- Check for any proxy/middleware modifying the request body

## Production Deployment

In production, you don't need ngrok. Use your actual domain:

```
Webhook URL: https://your-domain.com/api/auth/webhook/polar
```

Make sure:

- Your domain is publicly accessible
- HTTPS is properly configured
- `POLAR_WEBHOOK_SECRET` is set in production environment
- `POLAR_SERVER=production` (not sandbox)

## Scripts Reference

- `bun run ngrok` - Start ngrok tunnel
- `bun run dev` - Start dev server

## Files

- `scripts/start-ngrok.sh` - Ngrok startup script
- `.ngrok-url` - Saved ngrok URL (gitignored)
