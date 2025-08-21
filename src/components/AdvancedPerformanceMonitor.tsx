import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Cpu, MemoryStick, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  renderTime: number;
  bundleSize: {
    js: number;
    css: number;
    images: number;
    total: number;
  };
  apiCalls: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  userInteractions: {
    clicks: number;
    scrolls: number;
    keystrokes: number;
  };
  errors: {
    count: number;
    types: Record<string, number>;
  };
}

interface AdvancedPerformanceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  getMetrics: () => any;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

export const AdvancedPerformanceMonitor = memo(function AdvancedPerformanceMonitor({
  isOpen,
  onClose,
  getMetrics
}: AdvancedPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'5m' | '15m' | '1h' | '24h'>('15m');

  // Collect comprehensive performance metrics
  const collectMetrics = useCallback((): PerformanceMetrics => {
    const now = Date.now();
    
    // Memory usage
    const memory = (performance as any).memory || {};
    const memoryUsage = {
      used: memory.usedJSHeapSize || 0,
      total: memory.totalJSHeapSize || 0,
      percentage: memory.usedJSHeapSize && memory.totalJSHeapSize 
        ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 
        : 0
    };

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const renderTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;

    // Resource timing for bundle size analysis
    const resources = performance.getEntriesByType('resource');
    const bundleSize = resources.reduce(
      (acc, resource) => {
        const size = (resource as any).transferSize || 0;
        if (resource.name.endsWith('.js')) acc.js += size;
        else if (resource.name.endsWith('.css')) acc.css += size;
        else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) acc.images += size;
        acc.total += size;
        return acc;
      },
      { js: 0, css: 0, images: 0, total: 0 }
    );

    // API metrics from gemini service
    const apiMetrics = getMetrics();
    
    // User interaction tracking (simplified)
    const userInteractions = {
      clicks: parseInt(sessionStorage.getItem('user_clicks') || '0'),
      scrolls: parseInt(sessionStorage.getItem('user_scrolls') || '0'),
      keystrokes: parseInt(sessionStorage.getItem('user_keystrokes') || '0')
    };

    // Error tracking
    const errorLogs = JSON.parse(localStorage.getItem('app_errors') || '[]');
    const recentErrors = errorLogs.filter((error: any) => 
      Date.now() - new Date(error.context.timestamp).getTime() < 15 * 60 * 1000
    );
    
    const errorTypes = recentErrors.reduce((acc: Record<string, number>, error: any) => {
      acc[error.error.name] = (acc[error.error.name] || 0) + 1;
      return acc;
    }, {});

    return {
      timestamp: now,
      memoryUsage,
      renderTime,
      bundleSize,
      apiCalls: {
        total: apiMetrics.totalRequests || 0,
        successful: apiMetrics.successfulRequests || 0,
        failed: apiMetrics.failedRequests || 0,
        averageResponseTime: apiMetrics.averageResponseTime || 0
      },
      userInteractions,
      errors: {
        count: recentErrors.length,
        types: errorTypes
      }
    };
  }, [getMetrics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Advanced Performance Monitor</h2>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Advanced performance monitoring features coming soon</p>
        </div>
      </div>
    </div>
  );
});