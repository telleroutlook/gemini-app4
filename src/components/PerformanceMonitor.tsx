import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, CheckCircle, AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import type { PerformanceMetrics, KeyHealthStats } from '../types/chat';

interface PerformanceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  getMetrics: () => PerformanceMetrics | null;
}

export function PerformanceMonitor({ isOpen, onClose, getMetrics }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshMetrics = useCallback(() => {
    try {
      const currentMetrics = getMetrics();
      setMetrics(currentMetrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, [getMetrics]);

  useEffect(() => {
    if (isOpen) {
      // Initial load
      refreshMetrics();
      
      // Auto refresh every 5 seconds
      if (autoRefresh) {
        const interval = setInterval(() => {
          refreshMetrics();
        }, 5000);
        setRefreshInterval(interval);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  }, [isOpen, autoRefresh, refreshMetrics]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getHealthColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  const getHealthIcon = (isHealthy: boolean) => {
    return isHealthy ? CheckCircle : AlertCircle;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Performance Monitor</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'text-green-600' : 'text-gray-500'}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={refreshMetrics}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Manual Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {metrics ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Requests</p>
                      <p className="text-2xl font-bold text-blue-900">{metrics.totalRequests}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Success Rate</p>
                      <p className="text-2xl font-bold text-green-900">{metrics.successRate}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">Total Errors</p>
                      <p className="text-2xl font-bold text-yellow-900">{metrics.totalErrors}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Uptime</p>
                      <p className="text-2xl font-bold text-purple-900">{formatUptime(metrics.uptime)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* API Keys Health */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">API Key Health Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Key: {metrics.currentKeyIndex}/{metrics.totalKeys}</span>
                    <span className="text-gray-600">Healthy Keys: {metrics.healthyKeys}/{metrics.totalKeys}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {metrics.keyStats && metrics.keyStats.map((keyStats: KeyHealthStats, index: number) => {
                      const HealthIcon = getHealthIcon(keyStats.isHealthy);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <HealthIcon className={`h-5 w-5 ${getHealthColor(keyStats.isHealthy)}`} />
                            <div>
                              <p className="font-medium text-gray-900">API Key {keyStats.keyIndex}</p>
                              <p className="text-sm text-gray-500">
                                Success Rate: {keyStats.successRate}% | Consecutive Errors: {keyStats.consecutiveErrors}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {keyStats.successCount} Success / {keyStats.errorCount} Errors
                            </p>
                            <p className="text-xs text-gray-500">
                              Last Used: {new Date(keyStats.lastUsed).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {metrics.keyStats && metrics.keyStats.some((k: KeyHealthStats) => k.lastError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4">Recent Errors</h3>
                  <div className="space-y-2">
                    {metrics.keyStats
                      .filter((k: KeyHealthStats) => k.lastError)
                      .map((keyStats: KeyHealthStats, index: number) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-red-800">API Key {keyStats.keyIndex}:</span>
                          <span className="text-red-700 ml-2">{keyStats.lastError}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Performance Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Performance Suggestions</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  {metrics.successRate && parseFloat(metrics.successRate) < 90 && (
                    <p>• Low success rate, suggest checking API key validity</p>
                  )}
                  {metrics.healthyKeys < metrics.totalKeys && (
                    <p>• Unhealthy API keys detected, suggest replacement or inspection</p>
                  )}
                  {metrics.totalErrors > 10 && (
                    <p>• High error count, suggest checking network connection and key quotas</p>
                  )}
                  {metrics.healthyKeys === metrics.totalKeys && parseFloat(metrics.successRate) > 95 && (
                    <p>• All metrics normal, system running well!</p>
                  )}
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <details className="cursor-pointer">
                  <summary className="font-medium text-gray-900 mb-2">Technical Details</summary>
                  <pre className="text-xs text-gray-600 overflow-auto">
                    {JSON.stringify(metrics, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading performance data...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}