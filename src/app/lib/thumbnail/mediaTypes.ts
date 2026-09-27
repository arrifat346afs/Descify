/**
 * Shared predicate for "does this file belong in the thumbnail pipeline?".
 *
 * Every entry point that admits files (drag & drop validation, the automatic
 * thumbnail generator) must use the same rule, otherwise a file can be added
 * to the store and then silently never get a thumbnail.
 *
 * Vector formats (.ai / .eps) are the reason this helper exists: their MIME
 * type is `application/postscript`, not `image/*`, but they ARE thumbnailable —
 * the Rust/Ghostscript backend rasterizes them (see `src-tauri/src/services/vector.rs`).
 */

import { isVectorFile } from './vectorSupport';

/** Returns true when `file` can be turned into a thumbnail. */
export function isThumbnailableFile(file: File): boolean {
  return (
    file.type.startsWith('image/') ||
    file.type.startsWith('video/') ||
    isVectorFile(file)
  );
}
