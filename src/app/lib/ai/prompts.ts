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
  customInstruction?: string,
  avoidWords?: {
    titleAvoidWords?: string[];
    keywordsAvoidWords?: string[];
    descriptionAvoidWords?: string[];
  }
): string => {
  const titleLimit = limits?.titleLimit || 200;
  const descriptionLimit = limits?.descriptionLimit || 200;
  const keywordLimit = limits?.keywordLimit || 50;

  const placeNameRule = includePlaceName
    ? "Include location names if visible."
    : "Use generic terms, no location names.";

  // Build avoid words sections if provided
  const titleAvoidWordsSection = avoidWords?.titleAvoidWords && avoidWords.titleAvoidWords.length > 0
    ? `\nSTRICTLY FORBIDDEN: You MUST NOT include any of these words in the title under any circumstances: ${avoidWords.titleAvoidWords.join(', ')}. Verify your output does not contain any of these words.`
    : '';
  
  const descriptionAvoidWordsSection = avoidWords?.descriptionAvoidWords && avoidWords.descriptionAvoidWords.length > 0
    ? `\nSTRICTLY FORBIDDEN: You MUST NOT include any of these words in the description under any circumstances: ${avoidWords.descriptionAvoidWords.join(', ')}. Verify your output does not contain any of these words.`
    : '';
  
  const keywordsAvoidWordsSection = avoidWords?.keywordsAvoidWords && avoidWords.keywordsAvoidWords.length > 0
    ? `\nSTRICTLY FORBIDDEN: You MUST NOT include any of these words in the keywords under any circumstances: ${avoidWords.keywordsAvoidWords.join(', ')}. Verify your output does not contain any of these words.`
    : '';

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

    // Build avoid words replacements for custom template
    let processedTemplate = interpolatedTemplate;
    
    if (processedTemplate.includes('${placeNameRule}')) {
      processedTemplate = processedTemplate.replace(/\$\{placeNameRule\}/g, placeNameRule);
    }
    
    if (processedTemplate.includes('${titleAvoidWords}')) {
      processedTemplate = processedTemplate.replace(/\$\{titleAvoidWords\}/g, titleAvoidWordsSection);
    }
    
    if (processedTemplate.includes('${descriptionAvoidWords}')) {
      processedTemplate = processedTemplate.replace(/\$\{descriptionAvoidWords\}/g, descriptionAvoidWordsSection);
    }
    
    if (processedTemplate.includes('${keywordsAvoidWords}')) {
      processedTemplate = processedTemplate.replace(/\$\{keywordsAvoidWords\}/g, keywordsAvoidWordsSection);
    }

    return processedTemplate + customInstructionSection;
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
   ${titleAvoidWordsSection}

2. Description:
   - Target under ${descriptionLimit} characters
   - Write a complete, detailed description
   - End at a complete word (can be slightly over or under the target)
   - No colons (:) or special characters
   - ${placeNameRule}
   ${descriptionAvoidWordsSection}

3. Keywords:
   - Provide approximately ${keywordLimit} keywords
   - Comma-separated
   - No colons (:) or special characters
   ${keywordsAvoidWordsSection}

Return ONLY JSON:
{"title": "...", "description": "...", "keywords": "..."}`;
};

