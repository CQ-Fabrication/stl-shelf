#!/usr/bin/env bash

# Start ngrok tunnel for Polar webhooks during development
# This script creates a tunnel to localhost:3000 and saves the public URL
# to .ngrok-url file for easy access

set -e

PORT="${PORT:-3000}"
NGROK_URL_FILE=".ngrok-url"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ngrok tunnel for webhooks...${NC}"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}Error: ngrok is not installed${NC}"
    echo ""
    echo "Install ngrok:"
    echo "  macOS:   brew install ngrok"
    echo "  Linux:   snap install ngrok"
    echo "  Windows: choco install ngrok"
    echo ""
    echo "Or download from: https://ngrok.com/download"
    exit 1
fi

# Kill any existing ngrok processes
pkill -f "ngrok http" || true

# Start ngrok in background
echo "Starting ngrok on port $PORT..."
ngrok http $PORT --log=stdout > /dev/null 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 2

# Get the public URL from ngrok API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4 | head -n1)

if [ -z "$NGROK_URL" ]; then
    echo -e "${YELLOW}Failed to get ngrok URL. Is ngrok running?${NC}"
    kill $NGROK_PID 2>/dev/null || true
    exit 1
fi

# Save URL to file
echo "$NGROK_URL" > "$NGROK_URL_FILE"

echo -e "${GREEN}✓ Ngrok tunnel started!${NC}"
echo ""
echo "  Public URL:  $NGROK_URL"
echo "  Local:       http://localhost:$PORT"
echo "  Dashboard:   http://localhost:4040"
echo ""
echo -e "${YELLOW}Configure Polar webhook:${NC}"
echo "  1. Go to: https://polar.sh/dashboard/[your-org]/settings/webhooks"
echo "  2. Add endpoint: ${NGROK_URL}/api/auth/webhook/polar"
echo "  3. Copy webhook secret to .env as POLAR_WEBHOOK_SECRET"
echo ""
echo "Saved URL to: $NGROK_URL_FILE"
echo ""

# Keep script running (ngrok is in background)
# Press Ctrl+C to stop
trap "echo 'Stopping ngrok...'; pkill -f 'ngrok http'; rm -f $NGROK_URL_FILE; exit 0" INT TERM

# Wait for ngrok process
wait $NGROK_PID
