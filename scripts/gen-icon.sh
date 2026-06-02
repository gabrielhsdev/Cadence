#!/usr/bin/env bash
# Generates assets/icon.png (1024×1024) and assets/icon.icns from assets/icon.svg
# Requirements (macOS): rsvg-convert OR qlmanage (built-in) + sips + iconutil
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$REPO/assets/icon.svg"
PNG="$REPO/assets/icon.png"
ICONSET="$REPO/assets/icon.iconset"
ICNS="$REPO/assets/icon.icns"

# ── 1. SVG → 1024×1024 PNG ────────────────────────────────────────────────
echo "→ Rendering SVG to PNG…"

if command -v rsvg-convert &>/dev/null; then
  rsvg-convert -w 1024 -h 1024 "$SVG" -o "$PNG"
  echo "  Used: rsvg-convert"
elif command -v inkscape &>/dev/null; then
  inkscape --export-filename="$PNG" --export-width=1024 --export-height=1024 "$SVG"
  echo "  Used: inkscape"
else
  # macOS built-in fallback via qlmanage
  TMP="$(mktemp -d)"
  qlmanage -t -s 1024 -o "$TMP" "$SVG" 2>/dev/null || true
  RENDERED="$TMP/icon.svg.png"
  if [[ -f "$RENDERED" ]]; then
    cp "$RENDERED" "$PNG"
    echo "  Used: qlmanage (built-in)"
  else
    echo "Error: no SVG renderer found."
    echo "Install rsvg-convert with:  brew install librsvg"
    exit 1
  fi
fi

# ── 2. PNG → macOS .iconset ────────────────────────────────────────────────
echo "→ Building iconset…"
rm -rf "$ICONSET" && mkdir "$ICONSET"

# Each entry: <output-size> <filename>
entries=(
  "16   icon_16x16"
  "32   icon_16x16@2x"
  "32   icon_32x32"
  "64   icon_32x32@2x"
  "128  icon_128x128"
  "256  icon_128x128@2x"
  "256  icon_256x256"
  "512  icon_256x256@2x"
  "512  icon_512x512"
  "1024 icon_512x512@2x"
)

for entry in "${entries[@]}"; do
  size=$(echo "$entry" | awk '{print $1}')
  name=$(echo "$entry" | awk '{print $2}')
  sips -z "$size" "$size" "$PNG" --out "$ICONSET/${name}.png" >/dev/null
done

# ── 3. .iconset → .icns ───────────────────────────────────────────────────
echo "→ Creating .icns…"
iconutil -c icns "$ICONSET" -o "$ICNS"
rm -rf "$ICONSET"

echo ""
echo "✓  assets/icon.png   (1024×1024)"
echo "✓  assets/icon.icns  (macOS app icon)"
