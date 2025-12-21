# ExifTool Setup for Production Builds

## Problem
The application uses ExifTool to embed metadata into image and video files. In development, ExifTool is typically installed on the system, but in production builds, it needs to be bundled with the application.

## Solution

### Option 1: Bundle ExifTool with the Application (Recommended)

#### Quick Setup (All Platforms)

**Use the automated setup script:**
```bash
./scripts/setup-exiftool.sh
```

This script will automatically download and configure ExifTool for your platform.

#### Manual Setup for Linux (.deb, .rpm, AppImage)

1. **Download ExifTool:**
   ```bash
   cd src-tauri
   mkdir -p resources
   cd resources

   # Download the latest version (13.44 as of Dec 2025)
   wget https://exiftool.org/Image-ExifTool-13.44.tar.gz
   tar -xzf Image-ExifTool-13.44.tar.gz

   # Copy the exiftool script
   cp Image-ExifTool-13.44/exiftool .
   cp -r Image-ExifTool-13.44/lib .

   # Make it executable
   chmod +x exiftool

   # Clean up
   rm -rf Image-ExifTool-13.44 Image-ExifTool-13.44.tar.gz
   ```

2. **Update Tauri Configuration:**
   The `tauri.conf.json` needs to include the resources directory in the bundle.
   This is already configured in the updated config.

3. **Build the application:**
   ```bash
   bun run tauri build
   ```

#### Manual Setup for Windows

1. **Download ExifTool:**
   - Download from https://exiftool.org/exiftool-13.44.zip
   - Extract `exiftool(-k).exe` and rename it to `exiftool.exe`
   - Place it in `src-tauri/resources/`

#### Manual Setup for macOS

1. **Download ExifTool:**
   ```bash
   cd src-tauri/resources
   curl -O https://exiftool.org/Image-ExifTool-13.44.tar.gz
   tar -xzf Image-ExifTool-13.44.tar.gz
   cp Image-ExifTool-13.44/exiftool .
   cp -r Image-ExifTool-13.44/lib .
   chmod +x exiftool
   rm -rf Image-ExifTool-13.44 Image-ExifTool-13.44.tar.gz
   ```

   Or use Homebrew (then copy to resources/):
   ```bash
   brew install exiftool
   ```

### Option 2: Install ExifTool on User's System

If you prefer not to bundle ExifTool, users will need to install it:

**Linux:**
```bash
# Debian/Ubuntu
sudo apt-get install libimage-exiftool-perl

# Fedora/RHEL
sudo dnf install perl-Image-ExifTool

# Arch
sudo pacman -S perl-image-exiftool
```

**macOS:**
```bash
brew install exiftool
```

**Windows:**
- Download from https://exiftool.org/
- Add to PATH

### Option 3: Make it Optional

The application already handles missing ExifTool gracefully by showing a warning in the console. Users can still use the app without metadata embedding functionality.

## Verification

After bundling, verify that ExifTool is working:

1. Build the application
2. Run the built application
3. Try to embed metadata into an image
4. Check the console for any ExifTool errors

## Current Implementation

The Rust code (`src-tauri/src/lib.rs`) now:
1. First looks for a bundled ExifTool in the application's resources directory
2. Falls back to system PATH if not found
3. Provides helpful error messages if ExifTool is not available

## Recommended Approach for Distribution

For the best user experience, **bundle ExifTool with your application** using Option 1. This ensures:
- Users don't need to install additional dependencies
- The application works out of the box
- Consistent ExifTool version across all installations

