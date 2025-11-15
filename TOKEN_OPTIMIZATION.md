# Token Usage Optimization Guide

## Overview
Your app sends **1 request per image** to generate:
- Title
- Description  
- Keywords

This document explains how we've optimized token usage to minimize costs.

---

## Token Cost Breakdown (Per Request)

### Input Tokens (What you send to AI)
1. **Prompt Text**: ~100 tokens (optimized from ~400)
2. **Image**: ~170-340 tokens (512px thumbnail at 70% quality)
3. **Total Input**: ~270-440 tokens per request

### Output Tokens (What AI generates)
1. **Response**: ~100-200 tokens (title + description + keywords)
2. **Max Limited**: 500 tokens (hard limit to prevent overuse)

### **Total Per Image: ~370-640 tokens**

---

## Optimizations Applied

### 1. ✅ Shortened Prompt (75% reduction)
**Before** (~400 tokens):
```
You are a professional metadata generator for stock photos and videos.

ANALYZE the provided image carefully and generate REAL, SPECIFIC metadata...
[Long detailed instructions with examples]
```

**After** (~100 tokens):
```
Generate stock photo metadata for this image.

Requirements:
- Title: 200 chars max
- Description: 200 chars max  
- Keywords: 50 keywords max
- Use generic terms, no location names
- Be specific about what you see

Return ONLY JSON:
{"title": "...", "description": "...", "keywords": "..."}
```

**Savings**: ~300 tokens per request

---

### 2. ✅ Optimized Image Size
- **Resolution**: Max 512px (maintains quality while reducing tokens)
- **Format**: JPEG at 70% quality
- **Result**: ~170-340 tokens per image (vs 1000+ for full resolution)

**Savings**: ~660-830 tokens per request

---

### 3. ✅ Limited Output Tokens
- **Max Output**: 500 tokens (was 65536!)
- **Typical Output**: 100-200 tokens
- **Prevents**: Runaway token usage from verbose responses

**Savings**: Prevents accidental high costs

---

## Cost Estimates (OpenRouter Free Models)

### Free Models (Recommended)
Most free models on OpenRouter have **no cost** but may have rate limits:

| Model | Cost | Notes |
|-------|------|-------|
| Polaris Alpha (Free) | $0.00 | Best free option |
| Qwen 2.5 VL 32B (Free) | $0.00 | Good quality |
| Gemini 2.0 Flash (Free) | $0.00 | Fast responses |
| Nemotron Nano 12B (Free) | $0.00 | Lightweight |

### Paid Models (If needed)
If you use paid models, here are typical costs:

| Model | Input Cost | Output Cost | Per Image Cost |
|-------|-----------|-------------|----------------|
| GPT-4 Vision | $0.01/1K | $0.03/1K | ~$0.01-0.02 |
| GPT-4o | $0.005/1K | $0.015/1K | ~$0.005-0.01 |
| Gemini 1.5 Pro | $0.00125/1K | $0.005/1K | ~$0.002-0.004 |

**Example**: Processing 100 images with GPT-4o = ~$0.50-$1.00

---

## Best Practices to Minimize Costs

### 1. Use Free Models First
- Start with free OpenRouter models
- Only upgrade if quality is insufficient
- Free models are often good enough for metadata

### 2. Batch Processing
- Process multiple images in one session
- Use the request delay setting to avoid rate limits
- Default: 1 second delay between requests

### 3. Adjust Metadata Limits
Lower limits = fewer output tokens:
- **Title**: 100-150 chars (vs 200)
- **Description**: 150-200 chars (vs 300)
- **Keywords**: 30-40 keywords (vs 50)

### 4. Monitor Usage
- Check your OpenRouter dashboard regularly
- Set up billing alerts if using paid models
- Track cost per image

---

## Configuration Settings

### Current Optimized Settings
```typescript
// Prompt: ~100 tokens
// Image: 512px max, 70% JPEG quality
// Max Output: 500 tokens
// Total: ~370-640 tokens per image
```

### To Further Reduce Costs
1. **Reduce image size** (edit `thumbnailGenerator.ts`):
   ```typescript
   const maxSize = 384; // Instead of 512
   ```

2. **Lower JPEG quality** (edit `thumbnailGenerator.ts`):
   ```typescript
   canvas.toDataURL('image/jpeg', 0.5); // Instead of 0.7
   ```

3. **Shorten metadata limits** (in Settings UI):
   - Title: 100 chars
   - Description: 150 chars
   - Keywords: 30 keywords

---

## Token Usage Comparison

| Scenario | Tokens/Image | 100 Images | 1000 Images |
|----------|--------------|------------|-------------|
| **Optimized (Current)** | 370-640 | 37K-64K | 370K-640K |
| Before Optimization | 1200-2000 | 120K-200K | 1.2M-2M |
| **Savings** | ~60-70% | ~60-70% | ~60-70% |

---

## Troubleshooting

### "Not enough credits" Error
**Problem**: Requesting too many max_tokens
**Solution**: ✅ Fixed! Now limited to 500 tokens

### Rate Limit Errors
**Problem**: Sending requests too fast
**Solution**: Increase request delay in Settings (default: 1 second)

### Poor Quality Metadata
**Problem**: Prompt too short or image too small
**Solution**: 
- Current settings are balanced for quality/cost
- Try different free models
- Upgrade to paid model if needed

---

## Summary

✅ **Optimized token usage by 60-70%**
✅ **~370-640 tokens per image** (was 1200-2000)
✅ **Free models available** (no cost)
✅ **Paid models**: ~$0.002-0.02 per image
✅ **Safe limits** to prevent runaway costs

Your app is now optimized for minimal token usage while maintaining good metadata quality!

