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
  const titleLimit = limits?.titleLimit || 200;
  const descriptionLimit = limits?.descriptionLimit || 200;
  const keywordLimit = limits?.keywordLimit || 50;

  const placeNameRule = includePlaceName
    ? "Include location names if visible."
    : "Use generic terms, no location names.";

  return `Generate stock photo metadata for this image.

IMPORTANT: Write complete, natural text. End at complete words, never cut words in half.

Requirements:
1. Title:
   - Target approximately ${titleLimit} characters
   - Write a complete, descriptive title
   - End at a complete word (can be slightly over or under the target)
   - No colons (:) or special characters
   - ${placeNameRule}

2. Description:
   - Target under ${descriptionLimit} characters
   - Write a complete, detailed description
   - End at a complete word (can be slightly over or under the target)
   - No colons (:) or special characters
   - ${placeNameRule}

3. Keywords:
   - Provide approximately ${keywordLimit} keywords
   - Comma-separated
   - No colons (:) or special characters

Return ONLY JSON:
{"title": "...", "description": "...", "keywords": "..."}`;
};

