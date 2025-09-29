"use client";
import { getMemoryManager } from './memoryManager';

class DataChunker {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000; // Items per chunk
    this.maxConcurrentLoads = options.maxConcurrentLoads || 3;
    this.preloadBuffer = options.preloadBuffer || 2; // Number of chunks to preload
    this.memoryManager = getMemoryManager();
    
    this.loadingChunks = new Set();
    this.loadedChunks = new Map();
    this.loadPromises = new Map();
    
    this.stats = {
      totalChunks: 0,
      loadedChunks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      loadTime: 0
    };
  }

  // Split data into chunks
  createChunks(data, identifier = 'default') {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    const chunks = [];
    const totalItems = data.length;
    const totalChunks = Math.ceil(totalItems / this.chunkSize);
    
    for (let i = 0; i < totalItems; i += this.chunkSize) {
      const chunkIndex = Math.floor(i / this.chunkSize);
      const chunkData = data.slice(i, i + this.chunkSize);
      
      chunks.push({
        id: `${identifier}_chunk_${chunkIndex}`,
        index: chunkIndex,
        startIndex: i,
        endIndex: Math.min(i + this.chunkSize, totalItems),
        data: chunkData,
        size: chunkData.length,
        loaded: false,
        compressed: false
      });
    }

    this.stats.totalChunks = totalChunks;
    return chunks;
  }

  // Lazy load a specific chunk
  async loadChunk(chunkId, loadFunction) {
    // Check if already loaded
    const cached = this.memoryManager.getCache('dataChunks', chunkId);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    // Check if currently loading
    if (this.loadingChunks.has(chunkId)) {
      return this.loadPromises.get(chunkId);
    }

    // Start loading
    this.loadingChunks.add(chunkId);
    this.stats.cacheMisses++;
    
    const loadPromise = this._performChunkLoad(chunkId, loadFunction);
    this.loadPromises.set(chunkId, loadPromise);
    
    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingChunks.delete(chunkId);
      this.loadPromises.delete(chunkId);
    }
  }

  async _performChunkLoad(chunkId, loadFunction) {
    const startTime = performance.now();
    
    try {
      // Simulate network delay for demonstration
      const chunkData = await loadFunction(chunkId);
      
      // Compress large chunks
      const shouldCompress = this.memoryManager.getObjectSize(chunkData) > 10000; // 10KB
      let processedData = chunkData;
      
      if (shouldCompress) {
        const compressed = this.memoryManager.compressData(chunkData);
        if (compressed.ratio < 0.8) { // Only compress if we save at least 20%
          processedData = {
            ...chunkData,
            _compressed: true,
            _compressedData: compressed.data,
            _originalSize: compressed.originalSize
          };
        }
      }

      // Cache with appropriate TTL based on chunk size
      const ttl = chunkData.length > 500 ? 300000 : 600000; // 5min for large, 10min for small
      const priority = 2; // Medium priority for data chunks
      
      this.memoryManager.setCache('dataChunks', chunkId, processedData, {
        ttl,
        priority
      });

      this.stats.loadedChunks++;
      this.stats.loadTime += performance.now() - startTime;
      
      return processedData;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkId}:`, error);
      throw error;
    }
  }

  // Decompress chunk data if needed
  decompressChunk(chunkData) {
    if (!chunkData._compressed) {
      return chunkData;
    }

    try {
      const decompressed = this.memoryManager.decompressData(chunkData._compressedData);
      return decompressed;
    } catch (error) {
      console.error('Failed to decompress chunk:', error);
      return chunkData;
    }
  }

  // Get data for a specific range (with chunking)
  async getDataRange(startIndex, endIndex, loadFunction, identifier = 'default') {
    const startChunk = Math.floor(startIndex / this.chunkSize);
    const endChunk = Math.floor(endIndex / this.chunkSize);
    
    const loadPromises = [];
    const results = [];

    // Load all required chunks
    for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
      const chunkId = `${identifier}_chunk_${chunkIndex}`;
      loadPromises.push(this.loadChunk(chunkId, loadFunction));
    }

    const chunks = await Promise.all(loadPromises);
    
    // Extract the required data from loaded chunks
    let globalIndex = startChunk * this.chunkSize;
    
    for (const chunk of chunks) {
      const decompressedChunk = this.decompressChunk(chunk);
      const chunkData = decompressedChunk.data || decompressedChunk;
      
      for (const item of chunkData) {
        if (globalIndex >= startIndex && globalIndex < endIndex) {
          results.push({
            ...item,
            globalIndex,
            chunkIndex: Math.floor(globalIndex / this.chunkSize)
          });
        }
        globalIndex++;
        
        if (globalIndex >= endIndex) break;
      }
      
      if (globalIndex >= endIndex) break;
    }

    // Preload adjacent chunks if needed
    this.preloadAdjacentChunks(startChunk, endChunk, loadFunction, identifier);

    return results;
  }

  // Preload chunks that might be needed soon
  async preloadAdjacentChunks(startChunk, endChunk, loadFunction, identifier) {
    const preloadTasks = [];
    
    // Preload previous chunks
    for (let i = 1; i <= this.preloadBuffer; i++) {
      const chunkIndex = startChunk - i;
      if (chunkIndex >= 0) {
        const chunkId = `${identifier}_chunk_${chunkIndex}`;
        if (!this.memoryManager.getCache('dataChunks', chunkId) && 
            !this.loadingChunks.has(chunkId)) {
          preloadTasks.push(this.loadChunk(chunkId, loadFunction));
        }
      }
    }
    
    // Preload next chunks
    for (let i = 1; i <= this.preloadBuffer; i++) {
      const chunkIndex = endChunk + i;
      const chunkId = `${identifier}_chunk_${chunkIndex}`;
      if (!this.memoryManager.getCache('dataChunks', chunkId) && 
          !this.loadingChunks.has(chunkId)) {
        preloadTasks.push(this.loadChunk(chunkId, loadFunction));
      }
    }

    // Execute preloading in background (don't await)
    if (preloadTasks.length > 0) {
      Promise.all(preloadTasks).catch(error => {
        console.warn('Preloading failed:', error);
      });
    }
  }

  // Search within chunks
  async searchChunks(query, searchFunction, identifier = 'default') {
    const results = [];
    const searchTasks = [];

    // Get all chunk IDs from cache
    const allChunks = this.memoryManager.caches.get('dataChunks') || new Map();
    
    for (const [chunkId, chunkItem] of allChunks) {
      if (chunkId.startsWith(`${identifier}_chunk_`)) {
        searchTasks.push(this.searchInChunk(chunkId, query, searchFunction));
      }
    }

    const chunkResults = await Promise.all(searchTasks);
    
    // Flatten results
    chunkResults.forEach(chunkResult => {
      if (chunkResult && chunkResult.length > 0) {
        results.push(...chunkResult);
      }
    });

    return results;
  }

  async searchInChunk(chunkId, query, searchFunction) {
    const chunk = this.memoryManager.getCache('dataChunks', chunkId);
    if (!chunk) return [];

    const decompressedChunk = this.decompressChunk(chunk);
    const chunkData = decompressedChunk.data || decompressedChunk;
    
    return searchFunction(chunkData, query);
  }

  // Memory management for chunks
  clearChunks(identifier) {
    const keysToRemove = [];
    const dataChunksCache = this.memoryManager.caches.get('dataChunks');
    
    if (dataChunksCache) {
      for (const key of dataChunksCache.keys()) {
        if (key.startsWith(`${identifier}_chunk_`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        dataChunksCache.delete(key);
      });
    }

    // Clear loading states
    this.loadingChunks.clear();
    this.loadPromises.clear();
    
    // Reset stats
    this.stats = {
      totalChunks: 0,
      loadedChunks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      loadTime: 0
    };
  }

  // Get chunking statistics
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100 || 0,
      averageLoadTime: this.stats.loadTime / this.stats.loadedChunks || 0,
      currentlyLoading: this.loadingChunks.size,
      memoryUsage: this.memoryManager.getMemoryStats()
    };
  }
}

// Hook for React components
export function useDataChunker(options = {}) {
  const [chunker] = React.useState(() => new DataChunker(options));
  
  React.useEffect(() => {
    return () => {
      chunker.clearChunks('all');
    };
  }, [chunker]);

  return chunker;
}

// Singleton instance
let dataChunkerInstance = null;

export function getDataChunker(options = {}) {
  if (!dataChunkerInstance) {
    dataChunkerInstance = new DataChunker(options);
  }
  return dataChunkerInstance;
}

export default DataChunker;