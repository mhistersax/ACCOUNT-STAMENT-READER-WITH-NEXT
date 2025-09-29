"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getMemoryManager } from '../lib/memoryManager';
import { getDataChunker } from '../lib/dataChunker';

const MemoryMonitor = ({ 
  isVisible = false, 
  onToggle, 
  enableAlerts = true,
  alertThreshold = 80 // percentage
}) => {
  const [memoryStats, setMemoryStats] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const memoryManager = useMemo(() => getMemoryManager(), []);
  const dataChunker = useMemo(() => getDataChunker(), []);

  // Real-time memory monitoring
  useEffect(() => {
    if (!autoRefresh) return;

    const updateStats = () => {
      try {
        const stats = memoryManager.getMemoryStats();
        const chunkerStats = dataChunker.getStats();
        
        setMemoryStats({
          ...stats,
          chunker: chunkerStats,
          timestamp: Date.now()
        });

        // Check for memory pressure
        if (enableAlerts && stats.cache.utilization > alertThreshold) {
          handleMemoryAlert(stats);
        }
      } catch (error) {
        console.error('Failed to update memory stats:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [memoryManager, dataChunker, autoRefresh, enableAlerts, alertThreshold]);

  // Memory alert handler
  const handleMemoryAlert = useCallback((stats) => {
    const alertLevel = stats.cache.utilization > 95 ? 'critical' : 'warning';
    const alertMessage = `Memory usage: ${stats.cache.utilization.toFixed(1)}%`;
    
    const alert = {
      id: Date.now(),
      level: alertLevel,
      message: alertMessage,
      timestamp: new Date().toISOString(),
      stats: { ...stats }
    };

    setAlertHistory(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts

    if (alertLevel === 'critical') {
      toast.error(`Critical: ${alertMessage}`, {
        autoClose: false,
        toastId: 'memory-critical'
      });
    } else {
      toast.warning(`Warning: ${alertMessage}`, {
        toastId: 'memory-warning'
      });
    }
  }, []);

  // Memory cleanup actions
  const handleCleanupAction = useCallback((action) => {
    try {
      switch (action) {
        case 'gc':
          memoryManager.runGarbageCollection();
          toast.success('Garbage collection completed');
          break;
        case 'moderate':
          memoryManager.moderateCleanup();
          toast.success('Moderate cleanup completed');
          break;
        case 'aggressive':
          memoryManager.aggressiveCleanup();
          toast.success('Aggressive cleanup completed');
          break;
        case 'clear-chunks':
          dataChunker.clearChunks('all');
          toast.success('Data chunks cleared');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Cleanup action failed:', error);
      toast.error('Cleanup action failed');
    }
  }, [memoryManager, dataChunker]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value) => `${(value || 0).toFixed(1)}%`;

  const getUtilizationColor = (utilization) => {
    if (utilization > 90) return 'text-red-600 bg-red-100';
    if (utilization > 75) return 'text-yellow-600 bg-yellow-100';
    if (utilization > 50) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-16 left-4 z-30 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700"
        title="Memory Monitor"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-white border border-gray-300 rounded-lg shadow-xl max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="font-medium text-gray-800">Memory Monitor</span>
          
          {/* Status indicator */}
          {memoryStats && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              getUtilizationColor(memoryStats.cache.utilization)
            }`}>
              {formatPercentage(memoryStats.cache.utilization)}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-1 rounded ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}
            title="Auto refresh"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <svg className={`h-4 w-4 transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={onToggle}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {memoryStats ? (
          <>
            {/* Cache Statistics */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Cache Memory</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Allocated:</span>
                  <div className="font-medium">{formatBytes(memoryStats.cache.totalAllocated)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Hit Rate:</span>
                  <div className="font-medium">{formatPercentage(memoryStats.cache.hitRate)}</div>
                </div>
              </div>
            </div>

            {/* Browser Memory (if available) */}
            {memoryStats.browser && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Browser Heap</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Used:</span>
                    <div className="font-medium">{formatBytes(memoryStats.browser.usedJSHeapSize)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Limit:</span>
                    <div className="font-medium">{formatBytes(memoryStats.browser.jsHeapSizeLimit)}</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      memoryStats.browser.utilization > 90 ? 'bg-red-500' :
                      memoryStats.browser.utilization > 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${memoryStats.browser.utilization}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex space-x-1">
              <button
                onClick={() => handleCleanupAction('gc')}
                className="flex-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                GC
              </button>
              <button
                onClick={() => handleCleanupAction('moderate')}
                className="flex-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Clean
              </button>
              <button
                onClick={() => handleCleanupAction('aggressive')}
                className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Purge
              </button>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t pt-3 space-y-3">
                {/* Cache Namespaces */}
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-2">Cache Namespaces</h5>
                  <div className="space-y-1">
                    {memoryStats.cache.namespaces.map((ns) => (
                      <div key={ns.name} className="flex justify-between text-xs">
                        <span className="text-gray-600">{ns.name}</span>
                        <span className="font-medium">{ns.itemCount} items ({formatBytes(ns.totalSize)})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Chunker Stats */}
                {memoryStats.chunker && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-600 mb-2">Data Chunker</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Hit Rate:</span>
                        <div className="font-medium">{formatPercentage(memoryStats.chunker.hitRate)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Load:</span>
                        <div className="font-medium">{memoryStats.chunker.averageLoadTime.toFixed(1)}ms</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Alerts */}
                {alertHistory.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-600 mb-2">Recent Alerts</h5>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {alertHistory.slice(0, 3).map((alert) => (
                        <div key={alert.id} className={`text-xs p-1 rounded ${
                          alert.level === 'critical' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          <div className="flex justify-between">
                            <span>{alert.message}</span>
                            <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 text-sm py-4">
            Loading memory stats...
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryMonitor;