import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), convertFileSrc: vi.fn() }));
vi.mock('./imageCanvas', () => ({
  assetUrlToDataUrl: vi.fn(),
  generateImageViaCanvas: vi.fn().mockResolvedValue('preview'),
  resizeViaCanvas: vi.fn().mockReturnValue('thumbnail'),
}));
vi.mock('./videoThumbnail', () => ({ generateVideoThumbnail: vi.fn().mockResolvedValue('video') }));

import { generateImageThumbnail, generatePreviewImage } from './thumbnailService';
import { generateImageViaCanvas } from './imageCanvas';
import { generateVideoThumbnail } from './videoThumbnail';

beforeEach(() => vi.clearAllMocks());

it('shares image decoding across simultaneous import requests', async () => {
  const close = vi.fn();
  const decode = vi.fn().mockResolvedValue({ width: 120, height: 120, close });
  vi.stubGlobal('createImageBitmap', decode);
  const file = { name: 'photo.jpg', type: 'image/jpeg' } as File;
  const results = await Promise.all([generateImageThumbnail(file), generateImageThumbnail(file)]);
  expect(results).toEqual(['thumbnail', 'thumbnail']);
  expect(decode).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});

it('requests a high resolution image preview in the browser fallback', async () => {
  const file = { name: 'photo.jpg', type: 'image/jpeg' } as File;
  await generatePreviewImage(file);
  expect(generateImageViaCanvas).toHaveBeenCalledWith(file, 2560, 0.95);
});

it('does not use thumbnail resolution for browser video previews', async () => {
  const file = { name: 'clip.mp4', type: 'video/mp4' } as File;
  await generatePreviewImage(file);
  expect(generateVideoThumbnail).toHaveBeenCalledWith(file, 2560, 0.95);
});
