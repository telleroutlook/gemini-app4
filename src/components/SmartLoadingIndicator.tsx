import React, { useState, useEffect } from 'react';
import { Bot, Brain, Search, Image, Clock, Zap } from 'lucide-react';

interface SmartLoadingIndicatorProps {
  isLoading: boolean;
  isStreaming: boolean;
  currentStatus?: string;
  messageContent?: string;
  requestType?: 'text' | 'image' | 'analysis' | 'thinking';
  enableSmartIndicators?: boolean;
  enableRealtimeFeedback?: boolean;
}

interface LoadingPhase {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number;
  description?: string;
}

const getLoadingPhases = (requestType: string = 'text', messageContent: string = ''): LoadingPhase[] => {
  const content = messageContent.toLowerCase();
  
  // Detect request characteristics
  const isLongContent = messageContent.length > 500;
  const isCodeRequest = content.includes('code') || content.includes('function') || content.includes('programming');
  const isAnalysisRequest = content.includes('analyze') || content.includes('explain') || content.includes('why');
  const isCreativeRequest = content.includes('create') || content.includes('write') || content.includes('story');
  const isComplexQuery = isLongContent || isCodeRequest || isAnalysisRequest;
  
  if (requestType === 'image') {
    return [
      { id: 'processing', label: 'Processing Request', icon: Bot, duration: 1000, description: 'Analyzing image generation requirements' },
      { id: 'generating', label: 'Generating Image', icon: Image, duration: 8000, description: 'Using AI model to create image' },
      { id: 'finalizing', label: 'Finalizing', icon: Zap, duration: 500, description: 'Optimizing and outputting results' },
    ];
  }
  
  if (requestType === 'thinking' || isComplexQuery) {
    return [
      { id: 'thinking', label: 'Deep Thinking', icon: Brain, duration: 2000, description: 'Analyzing problem complexity' },
      { id: 'processing', label: 'Processing Information', icon: Bot, duration: 3000, description: 'Organizing relevant knowledge' },
      { id: 'generating', label: 'Organizing Answer', icon: Zap, duration: 2000, description: 'Building complete response' },
    ];
  }
  
  if (isAnalysisRequest) {
    return [
      { id: 'analyzing', label: 'Analyzing Content', icon: Search, duration: 2000, description: 'Deep understanding of the problem' },
      { id: 'processing', label: 'Processing Data', icon: Bot, duration: 2000, description: 'Integrating relevant information' },
      { id: 'generating', label: 'Generating Answer', icon: Zap, duration: 1500, description: 'Organizing analysis results' },
    ];
  }
  
  // Default for text requests
  const baseDuration = isLongContent ? 2000 : 1000;
  return [
    { id: 'processing', label: 'Understanding Question', icon: Bot, duration: baseDuration, description: 'Analyzing your request' },
    { id: 'generating', label: 'Generating Answer', icon: Zap, duration: baseDuration * 1.5, description: 'Building response content' },
  ];
};

export function SmartLoadingIndicator({ 
  isLoading, 
  isStreaming,
  currentStatus,
  messageContent = '',
  requestType = 'text',
  enableSmartIndicators = true,
  enableRealtimeFeedback = true,
}: SmartLoadingIndicatorProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [phases, setPhases] = useState<LoadingPhase[]>([]);

  useEffect(() => {
    if (isLoading && enableSmartIndicators) {
      const loadingPhases = getLoadingPhases(requestType, messageContent);
      setPhases(loadingPhases);
      setCurrentPhase(0);
      setElapsedTime(0);
    }
  }, [isLoading, requestType, messageContent, enableSmartIndicators]);

  useEffect(() => {
    if (!isLoading || !enableSmartIndicators) return;

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, enableSmartIndicators]);

  useEffect(() => {
    if (!isLoading || phases.length === 0) return;

    let totalDuration = 0;
    for (let i = 0; i <= currentPhase; i++) {
      totalDuration += phases[i]?.duration || 0;
    }

    if (elapsedTime >= totalDuration && currentPhase < phases.length - 1) {
      setCurrentPhase(prev => prev + 1);
    }
  }, [elapsedTime, currentPhase, phases, isLoading]);

  if (!isLoading) return null;

  // Simple mode - just basic loading dots
  if (!enableSmartIndicators) {
    return (
      <div className="flex justify-start">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-3 sm:px-4 py-3">
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Smart mode with phases and feedback
  const currentPhaseData = phases[currentPhase];
  if (!currentPhaseData) return null;

  const Icon = currentPhaseData.icon;
  const progress = Math.min(100, (elapsedTime / phases.reduce((sum, phase) => sum + phase.duration, 0)) * 100);

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Icon className="h-4 w-4 text-white animate-pulse" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 min-w-[200px]">
          <div className="space-y-2">
            {/* Current phase indicator */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {currentStatus || currentPhaseData.label}
              </span>
              {enableRealtimeFeedback && (
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.floor(elapsedTime / 1000)}s
                </div>
              )}
            </div>
            
            {/* Phase description */}
            {enableRealtimeFeedback && currentPhaseData.description && (
              <p className="text-xs text-gray-500">
                {currentPhaseData.description}
              </p>
            )}
            
            {/* Progress bar */}
            {enableRealtimeFeedback && (
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            
            {/* Phase indicators */}
            {enableRealtimeFeedback && phases.length > 1 && (
              <div className="flex space-x-1">
                {phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className={`h-1 rounded-full flex-1 transition-colors duration-300 ${
                      index <= currentPhase
                        ? 'bg-blue-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}