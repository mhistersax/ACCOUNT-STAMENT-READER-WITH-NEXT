"use client";

class MemoryManager {
  constructor() {
    this.caches = new Map();
    this.observers = new Map();
    this.thresholds = {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      maxItemAge: 10 * 60 * 1000, // 10 minutes
      gcInterval: 2 * 60 * 1000, // 2 minutes
      warningThreshold: 80, // 80% of maxCacheSize
      criticalThreshold: 95 // 95% of maxCacheSize
    };
    this.stats = {
      totalAllocated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      gcRuns: 0,
      itemsEvicted: 0,
      lastGC: null
    };
    this.gcInterval = null;
    this.startGarbageCollection();
  }

  // Initialize garbage collection
  startGarbageCollection() {
    this.gcInterval = setInterval(() => {
      this.runGarbageCollection();
    }, this.thresholds.gcInterval);
  }

  // Stop garbage collection
  stopGarbageCollection() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  // Get or estimate size of an object
  getObjectSize(obj) {
    if (!obj) return 0;
    
    try {
      // For simple estimation - not perfectly accurate but good enough
      const str = JSON.stringify(obj);
      return str.length * 2; // UTF-16 encoding approximation
    } catch (error) {
      // Fallback for circular references
      return this.estimateObjectSize(obj);
    }
  }

  // Estimate object size for complex objects
  estimateObjectSize(obj, visited = new WeakSet()) {
    if (obj === null || obj === undefined) return 0;
    if (visited.has(obj)) return 0;
    
    let size = 0;
    
    if (typeof obj === 'string') {
      size = obj.length * 2;
    } else if (typeof obj === 'number') {
      size = 8;
    } else if (typeof obj === 'boolean') {
      size = 1;
    } else if (Array.isArray(obj)) {
      visited.add(obj);
      size = obj.reduce((acc, item) => acc + this.estimateObjectSize(item, visited), 0);
    } else if (typeof obj === 'object') {
      visited.add(obj);
      size = Object.keys(obj).reduce((acc, key) => {
        return acc + key.length * 2 + this.estimateObjectSize(obj[key], visited);
      }, 0);
    }
    
    return size;
  }

  // Cache management
  setCache(namespace, key, value, options = {}) {
    const { ttl = this.thresholds.maxItemAge, priority = 1 } = options;
    
    if (!this.caches.has(namespace)) {
      this.caches.set(namespace, new Map());
    }
    
    const cache = this.caches.get(namespace);
    const size = this.getObjectSize(value);
    const item = {
      value,
      size,
      priority,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now()
    };
    
    // Check if adding this item would exceed memory limits
    if (this.stats.totalAllocated + size > this.thresholds.maxCacheSize) {
      this.evictLRU(namespace, size);
    }
    
    cache.set(key, item);
    this.stats.totalAllocated += size;
    
    this.notifyObservers('itemAdded', { namespace, key, size });
  }

  getCache(namespace, key) {
    const cache = this.caches.get(namespace);
    if (!cache) {
      this.stats.cacheMisses++;
      return null;
    }
    
    const item = cache.get(key);
    if (!item) {
      this.stats.cacheMisses++;
      return null;
    }
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.removeCache(namespace, key);
      this.stats.cacheMisses++;
      return null;
    }
    
    // Update access statistics
    item.accessCount++;
    item.lastAccess = Date.now();
    this.stats.cacheHits++;
    
    return item.value;
  }

  removeCache(namespace, key) {
    const cache = this.caches.get(namespace);
    if (!cache) return false;
    
    const item = cache.get(key);
    if (item) {
      this.stats.totalAllocated -= item.size;
      cache.delete(key);
      this.notifyObservers('itemRemoved', { namespace, key, size: item.size });
      return true;
    }
    return false;
  }

  // Clear entire namespace
  clearNamespace(namespace) {
    const cache = this.caches.get(namespace);
    if (!cache) return;
    
    let totalSize = 0;
    cache.forEach(item => {
      totalSize += item.size;
    });
    
    this.stats.totalAllocated -= totalSize;
    cache.clear();
    this.notifyObservers('namespaceCleared', { namespace, size: totalSize });
  }

  // Evict least recently used items
  evictLRU(namespace, requiredSpace) {
    const cache = this.caches.get(namespace);
    if (!cache) return;
    
    // Convert to array and sort by last access time (LRU first)
    const items = Array.from(cache.entries()).sort((a, b) => {
      const [, itemA] = a;
      const [, itemB] = b;
      
      // Consider priority and last access
      const priorityDiff = itemA.priority - itemB.priority;
      if (priorityDiff !== 0) return priorityDiff;
      
      return itemA.lastAccess - itemB.lastAccess;
    });
    
    let freedSpace = 0;
    let evictedCount = 0;
    
    for (const [key, item] of items) {
      if (freedSpace >= requiredSpace && 
          this.stats.totalAllocated < this.thresholds.maxCacheSize * 0.8) {
        break;
      }
      
      cache.delete(key);
      freedSpace += item.size;
      this.stats.totalAllocated -= item.size;
      evictedCount++;
    }
    
    this.stats.itemsEvicted += evictedCount;
    this.notifyObservers('itemsEvicted', { namespace, count: evictedCount, freedSpace });
  }

  // Garbage collection
  runGarbageCollection() {
    const startTime = Date.now();
    let totalEvicted = 0;
    let totalFreed = 0;
    
    this.caches.forEach((cache, namespace) => {
      const expiredItems = [];
      
      cache.forEach((item, key) => {
        // Check for expired items
        if (Date.now() - item.timestamp > item.ttl) {
          expiredItems.push(key);
        }
      });
      
      // Remove expired items
      expiredItems.forEach(key => {
        const item = cache.get(key);
        if (item) {
          cache.delete(key);
          this.stats.totalAllocated -= item.size;
          totalEvicted++;
          totalFreed += item.size;
        }
      });
      
      // If still over threshold, evict more items
      if (this.stats.totalAllocated > this.thresholds.maxCacheSize * 0.9) {
        this.evictLRU(namespace, this.thresholds.maxCacheSize * 0.1);
      }
    });
    
    this.stats.gcRuns++;
    this.stats.lastGC = new Date().toISOString();
    
    const gcTime = Date.now() - startTime;
    this.notifyObservers('garbageCollection', {
      duration: gcTime,
      itemsEvicted: totalEvicted,
      memoryFreed: totalFreed,
      totalAllocated: this.stats.totalAllocated
    });
    
    // Force browser garbage collection if available (Chrome DevTools)
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
  }

  // Memory monitoring
  getMemoryStats() {
    const memoryInfo = this.getBrowserMemoryInfo();
    
    return {
      cache: {
        totalAllocated: this.stats.totalAllocated,
        utilization: (this.stats.totalAllocated / this.thresholds.maxCacheSize) * 100,
        hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100 || 0,
        namespaces: Array.from(this.caches.entries()).map(([name, cache]) => ({
          name,
          itemCount: cache.size,
          totalSize: Array.from(cache.values()).reduce((sum, item) => sum + item.size, 0)
        }))
      },
      browser: memoryInfo,
      stats: { ...this.stats },
      thresholds: { ...this.thresholds }
    };
  }

  getBrowserMemoryInfo() {
    if (typeof window === 'undefined' || !window.performance || !window.performance.memory) {
      return null;
    }
    
    const memory = window.performance.memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      utilization: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  // Observer pattern for memory events
  addObserver(eventType, callback) {
    if (!this.observers.has(eventType)) {
      this.observers.set(eventType, []);
    }
    this.observers.get(eventType).push(callback);
  }

  removeObserver(eventType, callback) {
    const callbacks = this.observers.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyObservers(eventType, data) {
    const callbacks = this.observers.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Memory manager observer error:', error);
        }
      });
    }
  }

  // Memory pressure handling
  handleMemoryPressure() {
    const currentUtilization = (this.stats.totalAllocated / this.thresholds.maxCacheSize) * 100;
    
    if (currentUtilization > this.thresholds.criticalThreshold) {
      // Critical - aggressive cleanup
      this.aggressiveCleanup();
      this.notifyObservers('memoryPressure', { level: 'critical', utilization: currentUtilization });
    } else if (currentUtilization > this.thresholds.warningThreshold) {
      // Warning - moderate cleanup
      this.moderateCleanup();
      this.notifyObservers('memoryPressure', { level: 'warning', utilization: currentUtilization });
    }
  }

  aggressiveCleanup() {
    // Clear low-priority caches entirely
    this.caches.forEach((cache, namespace) => {
      if (namespace.includes('temp') || namespace.includes('preview')) {
        this.clearNamespace(namespace);
      }
    });
    
    // Evict 50% of remaining items
    this.caches.forEach((cache, namespace) => {
      const targetEvictions = Math.floor(cache.size * 0.5);
      this.evictLRU(namespace, targetEvictions * 1000); // Approximate space
    });
  }

  moderateCleanup() {
    // Evict 20% of items from each namespace
    this.caches.forEach((cache, namespace) => {
      const targetEvictions = Math.floor(cache.size * 0.2);
      this.evictLRU(namespace, targetEvictions * 1000); // Approximate space
    });
  }

  // Data compression utilities
  compressData(data) {
    try {
      // Simple JSON compression - remove whitespace and compress common patterns
      let compressed = JSON.stringify(data);
      
      // Replace common patterns
      compressed = compressed
        .replace(/{"id":/g, '{"i":')
        .replace(/,"date":/g, ',"d":')
        .replace(/,"amount":/g, ',"a":')
        .replace(/,"credit":/g, ',"c":')
        .replace(/,"debit":/g, ',"b":')
        .replace(/,"narration":/g, ',"n":')
        .replace(/,"reference":/g, ',"r":');
      
      return {
        data: compressed,
        originalSize: JSON.stringify(data).length,
        compressedSize: compressed.length,
        ratio: compressed.length / JSON.stringify(data).length
      };
    } catch (error) {
      return { data, originalSize: 0, compressedSize: 0, ratio: 1, error: error.message };
    }
  }

  decompressData(compressedData) {
    try {
      // Reverse the compression mapping
      let decompressed = compressedData
        .replace(/"i":/g, '"id":')
        .replace(/,"d":/g, ',"date":')
        .replace(/,"a":/g, ',"amount":')
        .replace(/,"c":/g, ',"credit":')
        .replace(/,"b":/g, ',"debit":')
        .replace(/,"n":/g, ',"narration":')
        .replace(/,"r":/g, ',"reference":');
      
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression error:', error);
      return null;
    }
  }

  // Cleanup and destroy
  destroy() {
    this.stopGarbageCollection();
    this.caches.clear();
    this.observers.clear();
    this.stats.totalAllocated = 0;
  }
}

// Singleton instance
let memoryManagerInstance = null;

export function getMemoryManager() {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager();
  }
  return memoryManagerInstance;
}

export default MemoryManager;