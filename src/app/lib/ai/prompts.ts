/**
 * AI Prompts Module
 * Contains prompt templates and prompt-related utilities for AI metadata generation
 */

export type MetadataLimits = {
  titleLimit?: number;
  descriptionLimit?: number;
  keywordLimit?: number;
};

/**
 * Generates a metadata generation prompt based on the provided limits
 * @param limits - The character/keyword limits for title, description, and keywords
 * @param includePlaceName - Whether to include location/place names in the metadata
 * @returns The formatted prompt string
 */
export const generateMetadataPrompt = (limits?: MetadataLimits, includePlaceName?: boolean): string => {
  const titleLimit = limits?.titleLimit;
  const descriptionLimit = limits?.descriptionLimit;
  const keywordLimit = limits?.keywordLimit;

  const placeNameRule = includePlaceName
    ? "Include location names if visible."
    : "Use generic terms, no location names.";

  return `Generate stock photo metadata for this image.

Requirements:
- Title: ${titleLimit} chars max
- Description: ${descriptionLimit} chars max
- Keywords: ${keywordLimit} keywords max, comma-separated
- ${placeNameRule}
- Be specific about what you see
- Use professional stock photo terms

Return ONLY JSON:
{"title": "...", "description": "...", "keywords": "..."}`;
};

