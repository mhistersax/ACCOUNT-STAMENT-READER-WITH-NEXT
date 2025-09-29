"use client";
import { getMemoryManager } from './memoryManager';

class DataOptimizer {
  constructor() {
    this.memoryManager = getMemoryManager();
    this.deduplicationCache = new Map();
    this.compressionStats = {
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      itemsProcessed: 0,
      duplicatesRemoved: 0,
      compressionRatio: 0
    };
  }

  // Remove duplicate transactions based on multiple criteria
  deduplicateTransactions(transactions, options = {}) {
    const {
      criteria = ['date', 'amount', 'narration'], // Fields to compare for duplicates
      threshold = 0.9, // Similarity threshold (0-1)
      keepFirst = true, // Keep first occurrence or last
      aggressiveMode = false // More aggressive deduplication
    } = options;

    if (!Array.isArray(transactions)) {
      return transactions;
    }

    const deduplicated = [];
    const duplicateHashes = new Set();
    const similarityCache = new Map();

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      if (!transaction) continue;

      // Generate hash based on criteria
      const hash = this.generateTransactionHash(transaction, criteria);
      
      if (duplicateHashes.has(hash)) {
        this.compressionStats.duplicatesRemoved++;
        continue;
      }

      // Check for similar transactions (fuzzy matching)
      if (aggressiveMode && this.findSimilarTransaction(transaction, deduplicated, threshold, criteria)) {
        this.compressionStats.duplicatesRemoved++;
        continue;
      }

      deduplicated.push(transaction);
      duplicateHashes.add(hash);
    }

    return deduplicated;
  }

  // Generate hash for transaction based on specified criteria
  generateTransactionHash(transaction, criteria) {
    const values = criteria.map(field => {
      const value = transaction[field];
      if (typeof value === 'string') {
        return value.toLowerCase().replace(/\s+/g, ' ').trim();
      }
      if (typeof value === 'number') {
        return Math.round(value * 100) / 100; // Round to 2 decimal places
      }
      if (value instanceof Date) {
        return value.toDateString();
      }
      return String(value || '');
    });
    
    return btoa(values.join('|')).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Find similar transaction using fuzzy matching
  findSimilarTransaction(transaction, existingTransactions, threshold, criteria) {
    for (const existing of existingTransactions) {
      const similarity = this.calculateSimilarity(transaction, existing, criteria);
      if (similarity >= threshold) {
        return existing;
      }
    }
    return null;
  }

  // Calculate similarity between two transactions
  calculateSimilarity(trans1, trans2, criteria) {
    let totalWeight = 0;
    let matchedWeight = 0;

    const weights = {
      date: 0.3,
      amount: 0.4,
      credit: 0.4,
      debit: 0.4,
      narration: 0.2,
      reference: 0.1
    };

    for (const field of criteria) {
      const weight = weights[field] || 0.1;
      totalWeight += weight;

      const val1 = trans1[field];
      const val2 = trans2[field];

      let fieldSimilarity = 0;

      if (typeof val1 === 'string' && typeof val2 === 'string') {
        fieldSimilarity = this.stringSimilarity(val1, val2);
      } else if (typeof val1 === 'number' && typeof val2 === 'number') {
        const diff = Math.abs(val1 - val2);
        const max = Math.max(Math.abs(val1), Math.abs(val2), 1);
        fieldSimilarity = 1 - (diff / max);
      } else if (val1 instanceof Date && val2 instanceof Date) {
        const dayDiff = Math.abs(val1.getTime() - val2.getTime()) / (1000 * 60 * 60 * 24);
        fieldSimilarity = dayDiff <= 1 ? 1 : 1 / (dayDiff + 1);
      } else if (val1 === val2) {
        fieldSimilarity = 1;
      }

      matchedWeight += fieldSimilarity * weight;
    }

    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  // Calculate string similarity using Levenshtein distance
  stringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();
    
    if (str1 === str2) return 1;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  // Levenshtein distance algorithm
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Compress transaction data by removing redundant fields and optimizing structure
  compressTransactionData(transactions, options = {}) {
    const {
      removeEmptyFields = true,
      optimizeStrings = true,
      createLookupTables = true,
      minimizeDecimalPlaces = true
    } = options;

    if (!Array.isArray(transactions)) {
      return { data: transactions, compressionInfo: null };
    }

    const originalSize = this.memoryManager.getObjectSize(transactions);
    let compressed = [...transactions];

    // Create lookup tables for repeated strings
    const lookupTables = {};
    if (createLookupTables) {
      const stringFields = ['narration', 'reference', 'bankName', 'accountType'];
      
      stringFields.forEach(field => {
        const uniqueValues = [...new Set(compressed.map(t => t[field]).filter(Boolean))];
        if (uniqueValues.length < compressed.length * 0.5) { // Only if significant reduction
          lookupTables[field] = uniqueValues;
        }
      });
    }

    // Compress individual transactions
    compressed = compressed.map(transaction => {
      const optimized = { ...transaction };

      // Remove empty/null fields
      if (removeEmptyFields) {
        Object.keys(optimized).forEach(key => {
          if (optimized[key] === null || optimized[key] === undefined || optimized[key] === '') {
            delete optimized[key];
          }
        });
      }

      // Optimize strings using lookup tables
      if (createLookupTables) {
        Object.keys(lookupTables).forEach(field => {
          if (optimized[field] && lookupTables[field].includes(optimized[field])) {
            optimized[field] = `#${lookupTables[field].indexOf(optimized[field])}`;
          }
        });
      }

      // Minimize decimal places for amounts
      if (minimizeDecimalPlaces) {
        ['credit', 'debit', 'amount', 'balance'].forEach(field => {
          if (typeof optimized[field] === 'number') {
            optimized[field] = Math.round(optimized[field] * 100) / 100;
          }
        });
      }

      // Optimize strings by removing extra whitespace
      if (optimizeStrings) {
        ['narration', 'reference', 'description'].forEach(field => {
          if (typeof optimized[field] === 'string') {
            optimized[field] = optimized[field].replace(/\s+/g, ' ').trim();
          }
        });
      }

      return optimized;
    });

    const compressedSize = this.memoryManager.getObjectSize({ data: compressed, lookupTables });
    const compressionRatio = compressedSize / originalSize;

    // Update stats
    this.compressionStats.totalOriginalSize += originalSize;
    this.compressionStats.totalCompressedSize += compressedSize;
    this.compressionStats.itemsProcessed += transactions.length;
    this.compressionStats.compressionRatio = 
      this.compressionStats.totalCompressedSize / this.compressionStats.totalOriginalSize;

    return {
      data: compressed,
      lookupTables,
      compressionInfo: {
        originalSize,
        compressedSize,
        ratio: compressionRatio,
        savings: originalSize - compressedSize,
        savingsPercent: ((originalSize - compressedSize) / originalSize) * 100
      }
    };
  }

  // Decompress transaction data
  decompressTransactionData(compressedData) {
    if (!compressedData || !compressedData.data) {
      return compressedData;
    }

    const { data, lookupTables } = compressedData;
    
    if (!lookupTables) {
      return data;
    }

    // Restore lookup table references
    const decompressed = data.map(transaction => {
      const restored = { ...transaction };
      
      Object.keys(lookupTables).forEach(field => {
        if (typeof restored[field] === 'string' && restored[field].startsWith('#')) {
          const index = parseInt(restored[field].substring(1));
          if (index >= 0 && index < lookupTables[field].length) {
            restored[field] = lookupTables[field][index];
          }
        }
      });
      
      return restored;
    });

    return decompressed;
  }

  // Optimize account data structure
  optimizeAccountData(account, options = {}) {
    const {
      deduplicateTransactions: dedupTransactions = true,
      compressTransactions = true,
      optimizeCalculations = true
    } = options;

    if (!account) return account;

    const optimized = { ...account };
    const originalSize = this.memoryManager.getObjectSize(account);

    // Deduplicate transactions
    if (dedupTransactions && optimized.transactions) {
      const originalCount = optimized.transactions.length;
      optimized.transactions = this.deduplicateTransactions(optimized.transactions, {
        criteria: ['date', 'credit', 'debit', 'narration'],
        threshold: 0.95,
        aggressiveMode: true
      });
      
      console.log(`Deduplication: ${originalCount} → ${optimized.transactions.length} transactions`);
    }

    // Compress transaction data
    if (compressTransactions && optimized.transactions) {
      const compression = this.compressTransactionData(optimized.transactions);
      optimized._compressedTransactions = compression;
      optimized._originalTransactionsSize = this.memoryManager.getObjectSize(optimized.transactions);
      
      // Replace transactions with compressed version if beneficial
      if (compression.compressionInfo.ratio < 0.8) {
        delete optimized.transactions; // Remove original to save memory
        optimized._isCompressed = true;
      }
    }

    // Optimize calculations cache
    if (optimizeCalculations && optimized.calculations) {
      const calcSize = this.memoryManager.getObjectSize(optimized.calculations);
      if (calcSize > 1000) { // Only compress if > 1KB
        const compressed = this.memoryManager.compressData(optimized.calculations);
        if (compressed.ratio < 0.8) {
          optimized._compressedCalculations = compressed.data;
          optimized._calculationsCompressed = true;
          delete optimized.calculations;
        }
      }
    }

    const optimizedSize = this.memoryManager.getObjectSize(optimized);
    
    return {
      ...optimized,
      _optimizationInfo: {
        originalSize,
        optimizedSize,
        compressionRatio: optimizedSize / originalSize,
        savings: originalSize - optimizedSize,
        savingsPercent: ((originalSize - optimizedSize) / originalSize) * 100
      }
    };
  }

  // Restore optimized account data
  restoreAccountData(optimizedAccount) {
    if (!optimizedAccount || !optimizedAccount._isCompressed) {
      return optimizedAccount;
    }

    const restored = { ...optimizedAccount };

    // Restore compressed transactions
    if (restored._compressedTransactions) {
      restored.transactions = this.decompressTransactionData(restored._compressedTransactions);
      delete restored._compressedTransactions;
      delete restored._isCompressed;
    }

    // Restore compressed calculations
    if (restored._calculationsCompressed && restored._compressedCalculations) {
      restored.calculations = this.memoryManager.decompressData(restored._compressedCalculations);
      delete restored._compressedCalculations;
      delete restored._calculationsCompressed;
    }

    // Clean up optimization metadata
    delete restored._optimizationInfo;
    delete restored._originalTransactionsSize;

    return restored;
  }

  // Get optimization statistics
  getStats() {
    return {
      ...this.compressionStats,
      cacheSize: this.deduplicationCache.size,
      averageCompressionRatio: this.compressionStats.compressionRatio,
      totalSavings: this.compressionStats.totalOriginalSize - this.compressionStats.totalCompressedSize,
      savingsPercent: this.compressionStats.totalOriginalSize > 0 
        ? ((this.compressionStats.totalOriginalSize - this.compressionStats.totalCompressedSize) 
           / this.compressionStats.totalOriginalSize) * 100 
        : 0
    };
  }

  // Reset statistics
  resetStats() {
    this.compressionStats = {
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      itemsProcessed: 0,
      duplicatesRemoved: 0,
      compressionRatio: 0
    };
    this.deduplicationCache.clear();
  }

  // Clear caches
  clearCaches() {
    this.deduplicationCache.clear();
  }
}

// Singleton instance
let dataOptimizerInstance = null;

export function getDataOptimizer() {
  if (!dataOptimizerInstance) {
    dataOptimizerInstance = new DataOptimizer();
  }
  return dataOptimizerInstance;
}

export default DataOptimizer;