# Dynamic Model Fetching Implementation

## Overview
Implemented dynamic model fetching for all AI providers with special filtering for OpenRouter models to show only those that support image/vision input.

## What Was Added

### 1. Model Fetcher Module
**File:** `src/app/lib/modelFetcher.ts`

A new utility module that handles dynamic fetching of available models from different AI providers:

#### Features:
- **OpenRouter Models**: Fetches models from `https://openrouter.ai/api/v1/models` API
  - Filters ONLY by `architecture.input_modalities` field (must include "image")
  - No fallback checks for model names or IDs
  - Shows ALL models with image input support (both free and paid) - typically ~111 models
  - Labels free models with "(Free)" suffix
  - Sorts alphabetically by label
  
- **OpenAI Models**: Fetches models from `https://api.openai.com/v1/models` API
  - Filters for vision-capable models (gpt-4o, gpt-4-turbo, gpt-4-vision)
  - Requires API key for fetching
  
- **Google Gemini Models**: Returns curated list
  - Google doesn't have a public models list endpoint
  - Returns hardcoded list of vision-capable Gemini models

#### Fallback Mechanism:
Each provider has fallback models that are used when:
- API request fails
- No API key is provided
- Network error occurs

### 2. Updated ApiSettings Component
**File:** `src/app/_component/settings/_component/ApiSettings.tsx`

#### Changes:
- Added `useState` and `useEffect` hooks for dynamic model loading
- Models are fetched automatically when provider changes
- Shows loading state while fetching models
- Disables model selection until provider is selected
- Displays appropriate placeholder messages

#### User Experience:
- **Before provider selection**: "Select a provider first"
- **While loading**: "Loading models..."
- **After loading**: Shows all available vision-capable models
- **On error**: Falls back to default models

### 3. Type Definitions

```typescript
export type ModelInfo = {
  value: string;        // Model ID (e.g., 'gpt-4o')
  label: string;        // Display name (e.g., 'GPT-4o')
  supportsVision?: boolean;  // Vision capability flag
};
```

## How It Works

### Flow:
1. User selects a provider (OpenAI, Google, or OpenRouter)
2. `useEffect` hook triggers model fetching
3. API request is made to the provider's models endpoint
4. Response is filtered for vision-capable models
5. Models are sorted and displayed in the dropdown
6. If API fails, fallback models are used

### OpenRouter Image Input Filtering:
Models are included if and ONLY if:
- `architecture.input_modalities` array includes `'image'`
- No other checks are performed (no name/ID matching)
- Both free (`:free` suffix) and paid models are included
- Result: ~111 image-capable models (10 free, 101 paid)
- This matches the OpenRouter website's "Image" input modality filter

## Benefits

✅ **Always Up-to-Date**: Models list is fetched dynamically from provider APIs
✅ **Vision-Only**: Only shows models that support image input
✅ **All Models**: OpenRouter shows both free and paid vision-capable models
✅ **Clear Labeling**: Free models are clearly marked with "(Free)" suffix
✅ **Graceful Degradation**: Falls back to curated list if API fails
✅ **Better UX**: Loading states and helpful placeholder messages
✅ **Type-Safe**: Full TypeScript support with proper types

## API Endpoints Used

- **OpenRouter**: `https://openrouter.ai/api/v1/models`
  - No authentication required for listing
  - Returns all available models with metadata
  
- **OpenAI**: `https://api.openai.com/v1/models`
  - Requires API key in Authorization header
  - Returns user's available models

- **Google Gemini**: No public endpoint
  - Uses curated fallback list

## Testing

To test the implementation:

1. Start the development server: `bun run dev`
2. Navigate to Settings → API Settings
3. Select a provider from the dropdown
4. Observe the models loading
5. Verify only vision-capable models are shown
6. For OpenRouter, verify only free models are displayed

## Future Enhancements

Potential improvements:
- Add caching to reduce API calls
- Add model descriptions/tooltips
- Show model pricing information
- Add model performance metrics
- Support for paid OpenRouter models (with toggle)
- Add Mistral and Groq provider support
- Implement model search/filter functionality

## Notes

- OpenRouter API doesn't require authentication for listing models
- OpenAI API requires a valid API key to list models
- Google Gemini doesn't have a public models list endpoint
- All models are filtered to ensure vision/image input support
- Free models are prioritized for OpenRouter to keep costs low

