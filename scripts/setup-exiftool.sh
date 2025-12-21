#!/bin/bash

# Script to download and setup ExifTool for bundling with Tauri app
# This ensures ExifTool is available in production builds

set -e

EXIFTOOL_VERSION="13.44"
RESOURCES_DIR="src-tauri/resources"

echo "🔧 Setting up ExifTool for bundling..."

# Create resources directory if it doesn't exist
mkdir -p "$RESOURCES_DIR"

# Detect OS
OS="$(uname -s)"

case "$OS" in
    Linux*)
        echo "📦 Downloading ExifTool for Linux..."
        cd "$RESOURCES_DIR"
        
        # Download ExifTool
        if [ ! -f "Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz" ]; then
            wget "https://exiftool.org/Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz"
        fi
        
        # Extract
        tar -xzf "Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz"
        
        # Copy exiftool and lib directory
        cp "Image-ExifTool-${EXIFTOOL_VERSION}/exiftool" .
        cp -r "Image-ExifTool-${EXIFTOOL_VERSION}/lib" .
        
        # Make executable
        chmod +x exiftool
        
        # Clean up
        rm -rf "Image-ExifTool-${EXIFTOOL_VERSION}" "Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz"
        
        echo "✅ ExifTool setup complete for Linux!"
        echo "📍 Location: $RESOURCES_DIR/exiftool"
        ;;
        
    Darwin*)
        echo "📦 Downloading ExifTool for macOS..."
        cd "$RESOURCES_DIR"
        
        # Check if Homebrew is available
        if command -v brew &> /dev/null; then
            echo "🍺 Homebrew detected. You can also install via: brew install exiftool"
        fi
        
        # Download ExifTool
        if [ ! -f "Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz" ]; then
            curl -O "https://exiftool.org/Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz"
        fi
        
        # Extract
        tar -xzf "Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz"
        
        # Copy exiftool and lib directory
        cp "Image-ExifTool-${EXIFTOOL_VERSION}/exiftool" .
        cp -r "Image-ExifTool-${EXIFTOOL_VERSION}/lib" .
        
        # Make executable
        chmod +x exiftool
        
        # Clean up
        rm -rf "Image-ExifTool-${EXIFTOOL_VERSION}" "Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz"
        
        echo "✅ ExifTool setup complete for macOS!"
        echo "📍 Location: $RESOURCES_DIR/exiftool"
        ;;
        
    MINGW*|MSYS*|CYGWIN*)
        echo "📦 For Windows, please manually download ExifTool:"
        echo "   1. Download from: https://exiftool.org/exiftool-${EXIFTOOL_VERSION}.zip"
        echo "   2. Extract exiftool(-k).exe and rename to exiftool.exe"
        echo "   3. Place in: $RESOURCES_DIR/"
        ;;
        
    *)
        echo "❌ Unsupported OS: $OS"
        exit 1
        ;;
esac

# Go back to project root
cd - > /dev/null

# Verify installation
if [ -f "$RESOURCES_DIR/exiftool" ]; then
    echo ""
    echo "🔍 Verifying ExifTool installation..."
    "$RESOURCES_DIR/exiftool" -ver
    echo ""
    echo "✨ ExifTool is ready to be bundled with your Tauri app!"
    echo "   Run 'bun run tauri build' to create a production build."
else
    echo "⚠️  ExifTool binary not found. Please check the setup."
    exit 1
fi

