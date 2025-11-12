# OpenRouter Integration

## Overview
Added OpenRouter as an AI provider with support for the Polaris Alpha reasoning model and other vision-capable models.

## What Was Added

### 1. OpenRouter Provider Module
**File:** `src/app/lib/ai/providers/openrouter.ts`

- Created OpenRouter provider using `@openrouter/ai-sdk-provider`
- Default model: `openrouter/polaris-alpha` (with reasoning capabilities)
- Supports all OpenRouter models including:
  - Polaris Alpha (reasoning model)
  - GPT-4o
  - GPT-4 Vision
  - Claude 3.5 Sonnet
  - Gemini Pro Vision

### 2. Integration with Main AI Module
**File:** `src/app/lib/ai.ts`

- Added OpenRouter to the provider initialization logic
- Imported `createOpenRouterModel` and `isOpenRouterProvider`
- Updated `initializeModel()` function to handle OpenRouter

### 3. UI Updates
**File:** `src/app/_component/settings/_component/ApiSettings.tsx`

- Added OpenRouter models to the dropdown:
  - Polaris Alpha (Reasoning)
  - GPT-4o
  - GPT-4 Vision
  - Claude 3.5 Sonnet
  - Gemini Pro Vision

### 4. Dependencies
**Package:** `@openrouter/ai-sdk-provider@1.2.1`

Installed via: `bun add @openrouter/ai-sdk-provider`

## How to Use

1. **Select Provider:**
   - Go to Settings → API Settings
   - Select "OpenRouter" from the Provider dropdown

2. **Choose Model:**
   - Select a model from the Model dropdown
   - Recommended: "Polaris Alpha (Reasoning)" for advanced reasoning capabilities

3. **Add API Key:**
   - Enter your OpenRouter API key
   - Get your key from: https://openrouter.ai/keys

4. **Generate Metadata:**
   - Upload images
   - Click "Generate" to create metadata using OpenRouter

## Polaris Alpha Reasoning Model

The Polaris Alpha model supports extended reasoning capabilities:

- **Reasoning enabled by default** in the provider
- Model can think through complex image analysis
- Better accuracy for detailed metadata generation
- Preserves reasoning details across multi-turn conversations

## Example API Call Structure

```typescript
// The provider handles this automatically
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "model": "openrouter/polaris-alpha",
    "messages": [
      {
        "role": "user",
        "content": [
          { "type": "text", "text": "Analyze this image..." },
          { "type": "image", "image": "data:image/jpeg;base64,..." }
        ]
      }
    ],
    "reasoning": {"enabled": true}
  })
});
```

## Benefits

✅ **Access to multiple AI models** through a single API
✅ **Reasoning capabilities** with Polaris Alpha
✅ **Cost-effective** - OpenRouter provides competitive pricing
✅ **Fallback options** - Multiple models available if one is unavailable
✅ **Vision support** - All listed models support image analysis

## Configuration

The OpenRouter provider is already configured in:
- `src/app/contexts/SettingsContext.tsx` - Provider type definition
- `src/app/lib/ai/providers/openrouter.ts` - Provider implementation
- `src/app/lib/ai.ts` - Main AI orchestrator

## Testing

To test the integration:

1. Set up OpenRouter API key in Settings
2. Select "Polaris Alpha (Reasoning)" model
3. Upload an image
4. Click "Generate" to test metadata generation
5. Check console logs for API responses

## Notes

- The reasoning details are automatically handled by the provider
- All OpenRouter models support vision/image analysis
- API key is stored securely in localStorage
- Provider selection persists across sessions

