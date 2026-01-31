/**
 * AI Prompts Module
 * Contains prompt templates and prompt-related utilities for AI metadata generation
 */

export type MetadataLimits = {
  titleLimit?: number;
  descriptionLimit?: number;
  keywordLimit?: number;
};

import { interpolateTemplate, TemplateVariables } from '../templateUtils';

/**
 * Generates a metadata generation prompt based on the provided limits
 * @param limits - The character/keyword limits for title, description, and keywords
 * @param includePlaceName - Whether to include location/place names in the metadata
 * @param customTemplate - Optional custom template to use instead of default
 * @param customInstruction - Optional custom instruction specific to this image
 * @returns The formatted prompt string
 */
export const generateMetadataPrompt = (
  limits?: MetadataLimits,
  includePlaceName?: boolean,
  customTemplate?: string,
  customInstruction?: string
): string => {
  const titleLimit = limits?.titleLimit || 200;
  const descriptionLimit = limits?.descriptionLimit || 200;
  const keywordLimit = limits?.keywordLimit || 50;

  const placeNameRule = includePlaceName
    ? "Include location names if visible."
    : "Use generic terms, no location names.";

  // Build custom instruction section if provided
  const customInstructionSection = customInstruction
    ? `\n\nADDITIONAL INSTRUCTIONS FOR THIS IMAGE:\n${customInstruction}\n`
    : '';

  // If custom template is provided, use it with variable interpolation
  if (customTemplate) {
    const variables: TemplateVariables = {
      titleLimit,
      descriptionLimit,
      keywordLimit,
      currentDate: new Date().toISOString().split('T')[0],
    };

    const interpolatedTemplate = interpolateTemplate(customTemplate, variables);

    // Add place name rule to the custom template if it doesn't already include place-specific content
    if (interpolatedTemplate.includes('${placeNameRule}')) {
      return interpolatedTemplate.replace(/\$\{placeNameRule\}/g, placeNameRule) + customInstructionSection;
    }

    return interpolatedTemplate + customInstructionSection;
  }

  // Use existing default logic when no custom template is provided
  return `Generate stock photo metadata for this image.${customInstructionSection}

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

