# ExifTool Production Fix - Summary

## Problem
The application was failing in production with the error:
```
[WARN] ⚠️ Failed to embed metadata for <file>.jpg: Failed to execute exiftool: No such file or directory (os error 2)
```

This happened because:
- In **development**: ExifTool was installed on the system and available in PATH
- In **production**: The bundled app didn't include ExifTool, so it couldn't be found

## Solution Implemented

### 1. Updated Rust Code (`src-tauri/src/lib.rs`)
- Added `get_exiftool_path()` function that searches for ExifTool in this order:
  1. Bundled with the app (in the same directory as the executable)
  2. In a `resources/` subdirectory
  3. System PATH (fallback)
- Updated `embed_metadata()` to use the bundled ExifTool path
- Improved error messages to help diagnose ExifTool issues

### 2. Updated Tauri Configuration (`src-tauri/tauri.conf.json`)
- Added `"resources": ["resources/*"]` to the bundle configuration
- This ensures the `src-tauri/resources/` directory is included in production builds

### 3. Created Setup Script (`scripts/setup-exiftool.sh`)
- Automated script to download and configure ExifTool
- Supports Linux and macOS
- Downloads ExifTool 13.44 (latest as of Dec 2025)
- Makes the binary executable
- Verifies the installation

### 4. Updated Build Script (`src-tauri/build.rs`)
- Checks if ExifTool is available during build
- Provides helpful warnings if ExifTool is not found
- Guides developers to bundle ExifTool properly

### 5. Created Documentation (`src-tauri/EXIFTOOL_SETUP.md`)
- Comprehensive guide for bundling ExifTool
- Instructions for all platforms (Linux, macOS, Windows)
- Alternative options (system installation, optional feature)

## How to Use

### For Development
ExifTool will work if:
1. It's bundled in `src-tauri/resources/` (recommended), OR
2. It's installed on your system

### For Production Builds

**Step 1: Bundle ExifTool**
```bash
# Run the automated setup script
./scripts/setup-exiftool.sh
```

**Step 2: Build the Application**
```bash
# Build for production
bun run tauri build
# or
npm run tauri build
# or
cargo tauri build
```

**Step 3: Verify**
The built application will now include ExifTool and metadata embedding will work!

## Files Changed

1. **src-tauri/src/lib.rs** - Updated ExifTool path resolution
2. **src-tauri/tauri.conf.json** - Added resources to bundle
3. **src-tauri/build.rs** - Added ExifTool verification
4. **scripts/setup-exiftool.sh** - New automated setup script
5. **src-tauri/EXIFTOOL_SETUP.md** - New documentation
6. **src-tauri/resources/** - New directory with bundled ExifTool

## Testing

To test that ExifTool is properly bundled:

1. Build the production app:
   ```bash
   cargo tauri build
   ```

2. Run the built application (location depends on platform):
   - Linux: `src-tauri/target/release/bundle/deb/` or `appimage/`
   - macOS: `src-tauri/target/release/bundle/macos/`
   - Windows: `src-tauri/target/release/bundle/msi/`

3. Try to embed metadata into an image
4. Check the console - you should NOT see the ExifTool error anymore

## Fallback Behavior

If ExifTool is still not found, the application will:
- Show a warning in the console
- Continue to work (other features remain functional)
- Display a helpful error message indicating ExifTool is missing

## Platform-Specific Notes

### Linux
- ExifTool is bundled as a Perl script with its library dependencies
- Works on all Linux distributions (.deb, .rpm, AppImage)

### macOS
- Same approach as Linux (Perl script + libraries)
- May need to grant permissions on first run

### Windows
- Requires the standalone .exe version
- Download from https://exiftool.org/exiftool-13.44.zip
- Rename `exiftool(-k).exe` to `exiftool.exe`

## Next Steps

1. ✅ ExifTool is now bundled in `src-tauri/resources/`
2. ✅ Rust code updated to find bundled ExifTool
3. ✅ Tauri config updated to include resources in bundle
4. 🔄 Build and test the production application
5. 🔄 Deploy the updated version

## Additional Resources

- ExifTool Official Site: https://exiftool.org/
- ExifTool Documentation: https://exiftool.org/exiftool_pod.html
- Tauri Bundling Guide: https://tauri.app/v1/guides/building/

