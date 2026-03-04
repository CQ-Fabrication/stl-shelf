#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVG_SOURCE="$ROOT_DIR/public/og-image.svg"
LOGO_SVG="$ROOT_DIR/public/logo-dark.svg"
LOGO_PNG="$ROOT_DIR/public/logo-dark.png"
OUTPUT_PNG="$ROOT_DIR/public/og-image.png"
TMP_SVG="$(mktemp "${TMPDIR:-/tmp}/og-image-inline.XXXXXX.svg")"

cleanup() {
  rm -f "$TMP_SVG"
}
trap cleanup EXIT

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "Missing dependency: rsvg-convert" >&2
  exit 1
fi

if [ ! -f "$SVG_SOURCE" ]; then
  echo "Missing source SVG: $SVG_SOURCE" >&2
  exit 1
fi

if [ ! -f "$LOGO_PNG" ]; then
  if [ ! -f "$LOGO_SVG" ]; then
    echo "Missing logo asset: $LOGO_PNG and $LOGO_SVG" >&2
    exit 1
  fi

  rsvg-convert -w 993 -h 356 "$LOGO_SVG" -o "$LOGO_PNG"
fi

LOGO_BASE64="$(base64 < "$LOGO_PNG" | tr -d '\n')"
INLINE_URI="data:image/png;base64,$LOGO_BASE64"

sed \
  -e "s|xlink:href=\"logo-dark.png\"|xlink:href=\"$INLINE_URI\"|g" \
  -e "s|href=\"logo-dark.png\"|href=\"$INLINE_URI\"|g" \
  "$SVG_SOURCE" > "$TMP_SVG"

rsvg-convert -w 1200 -h 630 "$TMP_SVG" -o "$OUTPUT_PNG"

echo "Generated $OUTPUT_PNG"
