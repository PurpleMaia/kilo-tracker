#!/bin/bash

# PWA Icon Generator Script
# Requires ImageMagick (brew install imagemagick) or sips (built into macOS)
#
# Usage: ./scripts/generate-pwa-icons.sh [source-image]
# If no source image provided, uses src/app/favicon.ico

set -e

SOURCE="${1:-src/app/favicon.ico}"
OUTPUT_DIR="public/icons"

echo "Generating PWA icons from: $SOURCE"
echo "Output directory: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

# Check if sips is available (macOS built-in)
if command -v sips &> /dev/null; then
    echo "Using sips (macOS native)..."

    # First convert ICO to PNG if needed
    if [[ "$SOURCE" == *.ico ]]; then
        echo "Converting ICO to PNG first..."
        # sips can read ICO files directly on macOS
        sips -s format png "$SOURCE" --out "$OUTPUT_DIR/temp-source.png" 2>/dev/null || {
            echo "Cannot convert ICO with sips. Please provide a PNG source image."
            exit 1
        }
        SOURCE="$OUTPUT_DIR/temp-source.png"
    fi

    # Generate required sizes
    sips -z 192 192 "$SOURCE" --out "$OUTPUT_DIR/icon-192x192.png"
    sips -z 512 512 "$SOURCE" --out "$OUTPUT_DIR/icon-512x512.png"
    sips -z 180 180 "$SOURCE" --out "$OUTPUT_DIR/apple-touch-icon.png"

    # Copy for maskable (you may want to add padding manually for maskable icons)
    cp "$OUTPUT_DIR/icon-192x192.png" "$OUTPUT_DIR/icon-maskable-192x192.png"
    cp "$OUTPUT_DIR/icon-512x512.png" "$OUTPUT_DIR/icon-maskable-512x512.png"

    # Cleanup temp file
    rm -f "$OUTPUT_DIR/temp-source.png"

elif command -v convert &> /dev/null; then
    echo "Using ImageMagick..."

    # Generate required sizes
    convert "$SOURCE" -resize 192x192 "$OUTPUT_DIR/icon-192x192.png"
    convert "$SOURCE" -resize 512x512 "$OUTPUT_DIR/icon-512x512.png"
    convert "$SOURCE" -resize 180x180 "$OUTPUT_DIR/apple-touch-icon.png"

    # Maskable icons with safe zone padding
    convert "$SOURCE" -resize 154x154 -gravity center -background "#3b82f6" -extent 192x192 "$OUTPUT_DIR/icon-maskable-192x192.png"
    convert "$SOURCE" -resize 410x410 -gravity center -background "#3b82f6" -extent 512x512 "$OUTPUT_DIR/icon-maskable-512x512.png"

else
    echo "Error: Neither sips nor ImageMagick found."
    echo "Install ImageMagick: brew install imagemagick"
    echo "Or use an online tool like https://realfavicongenerator.net"
    exit 1
fi

echo ""
echo "Icons generated successfully:"
ls -la "$OUTPUT_DIR"
echo ""
echo "Note: For best results with maskable icons, ensure your logo has"
echo "padding around it (safe zone is 80% of the icon area)."
