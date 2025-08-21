import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini';

interface ModelSwitchEvent {
  fromModel: string;
  toModel: string;
  reason: string;
  timestamp: Date;
}

interface ModelSwitchIndicatorProps {
  className?: string;
}

export function ModelSwitchIndicator({ className = '' }: ModelSwitchIndicatorProps) {
  const [recentSwitches, setRecentSwitches] = useState<ModelSwitchEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Get initial switch history
    const history = geminiService.getModelSwitchHistory();
    setRecentSwitches(history.slice(-3)); // Show last 3 switches
    
    // Set up callback for new model switches
    geminiService.setModelSwitchCallback((fromModel, toModel, reason) => {
      const newSwitch: ModelSwitchEvent = {
        fromModel,
        toModel,
        reason,
        timestamp: new Date(),
      };
      
      setRecentSwitches(prev => {
        const updated = [...prev, newSwitch].slice(-3); // Keep only last 3
        return updated;
      });
      
      // Show indicator temporarily when new switch occurs
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 10000); // Hide after 10 seconds
    });
  }, []);

  if (recentSwitches.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-20 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            智能模型切换
          </span>
        </div>
        
        <div className="space-y-2">
          {recentSwitches.map((switchEvent, index) => (
            <div key={index} className="text-xs text-blue-800 dark:text-blue-200">
              <div className="flex items-center gap-1">
                <span className="font-mono">{switchEvent.fromModel}</span>
                <span>→</span>
                <span className="font-mono font-semibold">{switchEvent.toModel}</span>
              </div>
              <div className="text-blue-600 dark:text-blue-300 mt-1">
                {switchEvent.reason}
              </div>
              <div className="text-blue-500 dark:text-blue-400 text-xs">
                {switchEvent.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-1 right-1 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
          aria-label="关闭"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}