/**
 * Shared rules for "does this file have metadata?" and "is ExifTool's output
 * worth pre-filling?".
 *
 * These two questions were previously answered independently in several places
 * (thumbnail border, progress counter, GenerateButton skip check) with
 * different thresholds, which let `.ai` files report as "has metadata" from
 * nothing more than the auto-generated `Title` ExifTool reports for them.
 */

import { isVectorFile } from '@/app/lib/thumbnail/vectorSupport';

export type MetadataLike = {
  title?: string;
  description?: string;
  keywords?: string;
} | null | undefined;

/** Non-empty after trimming (`undefined`/`null`/`""`/`"   "` all count as empty). */
const filled = (value?: string | null): boolean => !!value?.trim();

/**
 * True only when title, description AND keywords are all present.
 *
 * The single definition of "this file has metadata" — used for the green
 * border, the progress counter and skipping already-complete files, so the
 * three can never disagree again.
 */
export function hasCompleteMetadata(metadata: MetadataLike): boolean {
  return (
    !!metadata &&
    filled(metadata.title) &&
    filled(metadata.description) &&
    filled(metadata.keywords)
  );
}

export type ExifPrefill = {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
};

/**
 * Whether ExifTool's result should be written into the metadata store.
 *
 * Vector files (`.ai`/`.eps`) always carry a `Title`: legacy ones report the
 * PostScript header's `Untitled`, modern ones report the file name from XMP.
 * Neither is real metadata, and pre-filling it made those files show a green
 * "has metadata" border and count as completed in the progress bar before
 * anything had been generated — so for vectors a description or keywords is
 * required before pre-filling.
 */
export function shouldPrefillFromExif(file: File, exif: ExifPrefill): boolean {
  const hasAny = filled(exif.title) || filled(exif.description) || filled(exif.keywords);
  if (!hasAny) return false;

  if (isVectorFile(file)) {
    return filled(exif.description) || filled(exif.keywords);
  }

  return true;
}
