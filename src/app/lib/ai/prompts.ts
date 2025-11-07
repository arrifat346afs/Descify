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
  const keywordLimit = limits?.keywordLimit || 80;

  const placeNameRule = includePlaceName
    ? "6. INCLUDE specific location or place names if they are identifiable in the image (e.g., 'Eiffel Tower', 'New York City', 'Grand Canyon')"
    : "6. DO NOT include specific location or place names (e.g., city names, landmark names, country names). Use generic terms instead (e.g., 'city skyline' instead of 'New York skyline', 'mountain landscape' instead of 'Alps')";

  return `You are a professional metadata generator for stock photos and videos.

ANALYZE the provided image carefully and generate REAL, SPECIFIC metadata based on what you actually see.

STRICT REQUIREMENTS:
- Title: Maximum ${titleLimit} characters. Be specific and descriptive.
- Description: Maximum ${descriptionLimit} characters. Describe what's actually in the image.
- Keywords: Up to ${keywordLimit} relevant keywords, comma-separated.

IMPORTANT RULES:
1. DO NOT use generic phrases like "Auto-generated description"
2. DO NOT use placeholder text
3. DESCRIBE what you actually see in the image
4. BE SPECIFIC about colors, objects, actions, mood, composition
5. Use professional stock photo terminology
${placeNameRule}

Return ONLY valid JSON with this exact format:
{"title": "Your specific title here", "description": "Your detailed description here", "keywords": "keyword1, keyword2, keyword3"}

Example for a sunset beach photo ${includePlaceName ? 'WITH place names' : 'WITHOUT place names'}:
${includePlaceName
  ? '{"title": "Golden Sunset Over Waikiki Beach with Diamond Head Volcano", "description": "Vibrant orange and pink sunset casting warm light over Waikiki Beach in Honolulu, Hawaii, with the iconic Diamond Head volcanic crater silhouetted against the sky and calm Pacific Ocean waves", "keywords": "sunset, Waikiki Beach, Hawaii, Diamond Head, Honolulu, tropical, palm trees, ocean, golden hour, nature, vacation, paradise, seascape, Pacific"}'
  : '{"title": "Golden Sunset Over Tropical Beach with Palm Trees", "description": "Vibrant orange and pink sunset casting warm light over a pristine tropical beach with silhouetted palm trees and calm ocean waves", "keywords": "sunset, beach, tropical, palm trees, ocean, golden hour, nature, vacation, paradise, seascape"}'}`;
};

