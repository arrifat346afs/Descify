/**
 * AI Response Parser Module
 * Handles extraction and parsing of JSON format from AI API responses
 */

export type ParsedMetadata = {
  title: string;
  description: string;
  keywords: string;
};

export type MetadataLimits = {
  titleLimit?: number;
  descriptionLimit?: number;
  keywordLimit?: number;
};

/**
 * Extracts text content from various AI response formats
 * @param response - The raw response from the AI API
 * @returns The extracted text string
 */
export const extractTextFromResponse = (response: any): string => {
  if (typeof response === 'string') {
    return response;
  } else if (response?.text) {
    return response.text;
  } else {
    return JSON.stringify(response);
  }
};

/**
 * Extracts JSON from a text string that may contain additional content
 * @param text - The text containing JSON
 * @returns The extracted JSON string or null if not found
 */
export const extractJsonFromText = (text: string): string | null => {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    return text.slice(jsonStart, jsonEnd + 1);
  }
  
  return null;
};

/**
 * Validates that the parsed metadata meets quality standards
 * @param metadata - The parsed metadata object
 * @throws Error if validation fails
 */
export const validateMetadata = (metadata: any): void => {
  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || '').trim();

  if (!title || title.length < 5) {
    console.error('❌ Title too short or empty:', title);
    throw new Error('AI returned invalid title (too short)');
  }

  if (!description || description.length < 10) {
    console.error('❌ Description too short or empty:', description);
    throw new Error('AI returned invalid description (too short)');
  }
};

/**
 * Applies keyword limits to the parsed metadata
 * Note: Title and description limits are just guides for the AI, not enforced
 * @param metadata - The raw parsed metadata
 * @param limits - The limits to apply (only keywordLimit is enforced)
 * @returns The metadata with keyword limit applied
 */
export const applyLimits = (
  metadata: any,
  limits?: MetadataLimits
): ParsedMetadata => {
  const keywordLimit = limits?.keywordLimit || 80;

  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || '').trim();
  const keywords = String(metadata.keywords || '').trim();

  // Log the actual lengths for debugging
  console.log(`📏 Title length: ${title.length} characters`);
  console.log(`📏 Description length: ${description.length} characters`);

  return {
    title: title,
    description: description,
    keywords: keywords
      .split(',')
      .slice(0, keywordLimit)
      .map((k: string) => k.trim())
      .filter(Boolean)
      .join(', '),
  };
};

/**
 * Parses AI response text and extracts validated metadata
 * @param response - The raw AI API response
 * @param limits - Optional limits to apply to the metadata
 * @returns The parsed and validated metadata
 * @throws Error if parsing or validation fails
 */
export const parseMetadataResponse = (
  response: any,
  limits?: MetadataLimits
): ParsedMetadata => {
  // Extract text from response
  const text = extractTextFromResponse(response);
  console.log('AI Response text:', text);

  // Extract JSON from text
  const jsonStr = extractJsonFromText(text);
  
  if (!jsonStr) {
    console.error('No JSON found in AI response:', text);
    throw new Error('AI did not return valid JSON format');
  }

  try {
    const parsed = JSON.parse(jsonStr);
    console.log('Parsed JSON:', parsed);

    // Validate the parsed metadata
    validateMetadata(parsed);

    // Apply limits and return
    return applyLimits(parsed, limits);
  } catch (err) {
    console.error('Failed to parse JSON from AI response:', err);
    console.error('Raw response:', text);
    throw new Error(`Failed to parse AI response: ${err}`);
  }
};

// /**
//  * Creates fallback metadata when AI generation fails
//  * @param fileNames - The file names to use for fallback
//  * @param limits - Optional limits to apply
//  * @returns Fallback metadata based on file names
//  */
// export const createFallbackMetadata = (
//   fileNames: string[],
//   limits?: MetadataLimits
// ): ParsedMetadata => {
//   const descriptionLimit = limits?.descriptionLimit ?? 300;
//   const keywordLimit = limits?.keywordLimit ?? 5;

//   return {
//     title: fileNames[0] || 'Untitled',
//     description: `Auto-generated description for ${fileNames.join(', ')}`.slice(
//       0,
//       descriptionLimit
//     ),
//     keywords: fileNames
//       .slice(0, keywordLimit)
//       .map((f) => f.replace(/\.[^.]+$/, ''))
//       .join(', '),
//   };
// };

