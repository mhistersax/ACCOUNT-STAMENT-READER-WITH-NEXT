"use client";
import React, { useMemo, useCallback, useRef, useEffect, useState, forwardRef } from "react";
import { getMemoryManager } from "../lib/memoryManager";

const VirtualizedTransactionList = forwardRef(({
  transactions,
  itemHeight = 80,
  containerHeight = 400,
  renderItem,
  bufferSize = 5, // Number of items to render outside viewport
  cacheKey = 'transactions', // Cache namespace
  enableMemoryMonitoring = true,
}, ref) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const memoryManager = useMemo(() => getMemoryManager(), []);
  const prevTransactionsLength = useRef(transactions.length);

  // Reset scroll position when transactions change (e.g., after search)
  useEffect(() => {
    if (prevTransactionsLength.current !== transactions.length) {
      setScrollTop(0);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      prevTransactionsLength.current = transactions.length;
    }
  }, [transactions.length]);

  // Merge external ref with internal containerRef
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(containerRef.current);
      } else if (ref.current !== undefined) {
        ref.current = containerRef.current;
      }
    }
  }, [ref]);

  // Enhanced calculations with buffer
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const bufferItemsCount = bufferSize;
  const totalItemsHeight = transactions.length * itemHeight;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItemsCount);
  const endIndex = Math.min(
    Math.floor(scrollTop / itemHeight) + visibleItemsCount + bufferItemsCount,
    transactions.length
  );

  // Memory-optimized visible items with caching
  const visibleItems = useMemo(() => {
    const cacheKeyWithRange = `${cacheKey}_${startIndex}_${endIndex}`;
    
    // Check cache first
    const cached = memoryManager.getCache('virtualizedList', cacheKeyWithRange);
    if (cached && cached.length === (endIndex - startIndex)) {
      return cached;
    }

    // Create new slice
    const items = transactions.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      virtualIndex: index
    }));

    // Cache the result with high priority during scrolling
    const priority = isScrolling ? 3 : 1;
    memoryManager.setCache('virtualizedList', cacheKeyWithRange, items, {
      ttl: isScrolling ? 30000 : 10000, // 30s while scrolling, 10s otherwise
      priority
    });

    return items;
  }, [transactions, startIndex, endIndex, cacheKey, memoryManager, isScrolling]);

  // Optimized scroll handler with debouncing
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set timeout to mark scrolling as finished
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      // Run cleanup after scrolling stops
      memoryManager.runGarbageCollection();
    }, 150);
  }, [memoryManager]);

  // Monitor memory usage
  useEffect(() => {
    if (!enableMemoryMonitoring) return;

    const handleMemoryPressure = (data) => {
      if (data.level === 'warning' || data.level === 'critical') {
        // Clear old cache entries for this component
        memoryManager.clearNamespace('virtualizedList_old');
        console.warn('Virtual list memory pressure detected:', data);
      }
    };

    memoryManager.addObserver('memoryPressure', handleMemoryPressure);

    return () => {
      memoryManager.removeObserver('memoryPressure', handleMemoryPressure);
    };
  }, [memoryManager, enableMemoryMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Clean up caches for this instance
      memoryManager.clearNamespace(`virtualizedList_${cacheKey}`);
    };
  }, [memoryManager, cacheKey]);

  // Performance monitoring
  const renderStart = performance.now();
  
  const listElement = (
    <div
      ref={containerRef}
      className="overflow-auto border border-gray-200 rounded-lg"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalItemsHeight, position: "relative" }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, virtualIndex) => {
            // Memory-efficient item rendering
            const itemKey = item.id || `${startIndex}-${virtualIndex}`;
            
            return (
              <div
                key={itemKey}
                style={{ height: itemHeight }}
                className={`border-b border-gray-100 last:border-b-0 ${
                  isScrolling ? 'pointer-events-none' : ''
                }`}
                data-index={item.index}
              >
                {renderItem(item, item.index)}
              </div>
            );
          })}
        </div>
        
        {/* Performance debug info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-20 left-4 bg-black text-white text-xs p-2 rounded opacity-75 z-50">
            <div>Rendered: {visibleItems.length} items</div>
            <div>Range: {startIndex}-{endIndex}</div>
            <div>Total: {transactions.length}</div>
            <div>Scrolling: {isScrolling ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  );

  // Log performance metrics
  if (enableMemoryMonitoring) {
    const renderTime = performance.now() - renderStart;
    if (renderTime > 16) { // Log if render takes longer than one frame (16ms)
      console.warn(`Virtual list render took ${renderTime.toFixed(2)}ms`, {
        visibleItems: visibleItems.length,
        totalItems: transactions.length,
        range: `${startIndex}-${endIndex}`
      });
    }
  }

  return listElement;
});

VirtualizedTransactionList.displayName = 'VirtualizedTransactionList';

export default VirtualizedTransactionList;