# Agent Instructions: Fix Tauri + Nvidia + WebKitGTK Rendering Issues (Linux)

## 🎯 Goal
Ensure Tauri applications run correctly on Linux systems with Nvidia GPUs by preventing:
- EGL_BAD_ALLOC crashes
- Blank / white screen issues
- Wayland protocol errors
- WebKitGTK DMA-BUF failures

---

## 🧠 Root Cause Summary
- WebKitGTK uses DMA-BUF rendering by default
- Nvidia drivers have unstable GBM + DMA-BUF + explicit sync support
- This causes crashes or invisible UI
- Backend GPU (WGPU/Vulkan/OpenGL) is NOT the issue

---

## ✅ Required Fix Strategy
Disable problematic frontend rendering paths WITHOUT disabling backend GPU acceleration

---

## 🔧 Step 1: Inject Environment Variables (CRITICAL)

Modify src-tauri/src/main.rs:

```rust
fn main() {
    #[cfg(any(
        target_os = "linux",
        target_os = "freebsd",
        target_os = "dragonfly",
        target_os = "openbsd",
        target_os = "netbsd"
    ))]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 🔧 Step 2: Optional Debug Fix (Wayland Flickering)

```bash
__NV_DISABLE_EXPLICIT_SYNC=1 npm run tauri dev
```

---

## 🔧 Step 3: Production (.desktop fix)

```bash
Exec=env WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 YourAppName
```

---

## 🔧 Step 4: AppImage Users

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 ./YourApp.AppImage
```

---

## ⚙️ Step 5: Enforce Safe Tauri Config

```json
{
  "tauri": {
    "windows": [
      {
        "transparent": false
      }
    ]
  }
}
```

---

## ⚙️ Step 6: Ensure Proper GPU Backend

- Prefer: Vulkan
- Fallback: OpenGL
- Avoid: Auto

---

## 🚫 DO NOT DO

- Do NOT disable all GPU acceleration globally
- Do NOT use: GDK_DISABLE=egl:glx
- Do NOT rely on DMA-BUF on Nvidia

---

## ✅ Expected Result

- App launches without crash
- UI renders correctly
- GPU compute still works
- Stable on Wayland + X11

---

## 🧪 Verification Checklist

- App starts without crash
- No white/blank window
- No EGL errors in logs
- GPU processing still active
- Works under Wayland AND X11
