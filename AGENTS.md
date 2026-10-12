# Agent Instructions

## Locked files — video thumbnail fix (2026-10-11)

The following files contain the working video-upload / video-thumbnail fix.
Do NOT edit, rewrite, or reformat them without explicit user approval:

- `src/app/lib/thumbnail/rustBridge.ts`
- `src/app/lib/thumbnail/imageCanvas.ts`
- `src/app/lib/thumbnail/thumbnailService.ts`
- `src/app/lib/thumbnail/videoThumbnail.ts`
- `src/app/_component/action/button/UploadButton.tsx`
- `src/app/_component/file-preview/FileSection.tsx`
- `src/app/_component/thumbnail/ThumbnailSection.tsx`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`

Before touching any of these files (via `edit`, `write`, `patch`, or a
`shell` command that modifies them), you MUST:

1. Use the `question` tool to ask the user for permission, naming the file
   and describing the intended change.
2. If the user does not reply, do NOT proceed — ask again. Never default to
   editing without an answer. A missing reply means "wait", not "yes".
3. Reads (`read`, `grep`, `glob`) are always allowed and need no approval.

`opencode.json` enforces the same rule at the permission layer (`ask` on
`edit`/`shell` for these paths) as a backstop, but the `question`-first
workflow above is required regardless.
