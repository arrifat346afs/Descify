import { generateThumbnailsBatch } from '@/app/lib/thumbnailGenerator';

export interface CachedFolder {
  folderPath: string;
  files: File[];
  thumbnails: Map<File, string>;
  lastGenerated: number;
  imageCount: number;
  videoCount: number;
}

class ThumbnailCache {
  private cache = new Map<string, CachedFolder>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Generate thumbnails for a folder and cache them
   */
  async generateThumbnails(
    folderPath: string,
    files: File[],
    onProgress?: (progress: number) => void,
    onThumbnailReady?: (file: File, thumbnailUrl: string) => void
  ): Promise<CachedFolder> {
    // Check if we have a fresh cache
    const existing = this.get(folderPath);
    if (existing && this.isCacheValid(existing)) {
      return existing;
    }

    // Filter for image and video files
    const mediaFiles = files.filter(file => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      return isImage || isVideo;
    });

    const imageCount = mediaFiles.filter(f => f.type.startsWith("image/")).length;
    const videoCount = mediaFiles.filter(f => f.type.startsWith("video/")).length;

    // Generate thumbnails using existing utility
    const thumbnailMap = await generateThumbnailsBatch(
      mediaFiles,
      onProgress,
      onThumbnailReady
    );

    const cachedFolder: CachedFolder = {
      folderPath,
      files: mediaFiles,
      thumbnails: thumbnailMap,
      lastGenerated: Date.now(),
      imageCount,
      videoCount,
    };

    this.cache.set(folderPath, cachedFolder);
    return cachedFolder;
  }

  /**
   * Get cached thumbnails for a folder
   */
  get(folderPath: string): CachedFolder | undefined {
    const cached = this.cache.get(folderPath);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(folderPath);
    }
    
    return undefined;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cached: CachedFolder): boolean {
    return Date.now() - cached.lastGenerated < this.CACHE_TTL;
  }

  /**
   * Clear cache for a specific folder
   */
  clearFolder(folderPath: string): void {
    const cached = this.cache.get(folderPath);
    if (cached) {
      // Clean up thumbnail URLs to free memory
      cached.thumbnails.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      this.cache.delete(folderPath);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    // Clean up all thumbnail URLs
    this.cache.forEach((cached) => {
      cached.thumbnails.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    });
    this.cache.clear();
  }

  /**
   * Get all cached folders
   */
  getAll(): Map<string, CachedFolder> {
    // Return only valid cache entries
    const validCache = new Map<string, CachedFolder>();
    
    this.cache.forEach((cached, path) => {
      if (this.isCacheValid(cached)) {
        validCache.set(path, cached);
      } else {
        // Clean up expired entries
        cached.thumbnails.forEach((url) => {
          URL.revokeObjectURL(url);
        });
      }
    });
    
    this.cache = validCache;
    return validCache;
  }

  /**
   * Get cache size (number of folders)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.cache.forEach((cached, path) => {
      if (now - cached.lastGenerated >= this.CACHE_TTL) {
        toDelete.push(path);
        // Clean up thumbnail URLs
        cached.thumbnails.forEach((url) => {
          URL.revokeObjectURL(url);
        });
      }
    });
    
    toDelete.forEach(path => this.cache.delete(path));
  }
}

// Export singleton instance
export const thumbnailCache = new ThumbnailCache();

