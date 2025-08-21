import React, { useState, useEffect, useRef } from 'react';
import { Square, Copy, Download } from 'lucide-react';
import { Button } from './ui/Button';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  onStop?: () => void;
  className?: string;
  enableTypewriter?: boolean;
}

export function StreamingMessage({ 
  content, 
  isStreaming, 
  onStop, 
  className = '',
  enableTypewriter = true
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [typingSpeed] = useState(20); // milliseconds per character

  // Typewriter effect
  useEffect(() => {
    if (!enableTypewriter || !isStreaming) {
      // If typewriter is disabled or not streaming, show all content immediately
      setDisplayedContent(content);
      setCurrentIndex(content.length);
      return;
    }

    if (isStreaming && content && currentIndex < content.length) {
      intervalRef.current = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(prev => prev + 1);
      }, typingSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [content, currentIndex, isStreaming, typingSpeed, enableTypewriter]);

  // Reset when new content starts
  useEffect(() => {
    if (isStreaming && content.length < displayedContent.length) {
      setDisplayedContent('');
      setCurrentIndex(0);
    }
  }, [content, isStreaming, displayedContent.length]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayedContent);
  };

  const downloadAsText = () => {
    const blob = new Blob([displayedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="prose prose-gray max-w-none">
        <div className="whitespace-pre-wrap break-words">
          {displayedContent}
          {isStreaming && (
            <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {isStreaming && onStop && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Square className="h-3 w-3 mr-1" />
            停止生成
          </Button>
        )}
        
        {!isStreaming && displayedContent && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-gray-500 hover:text-gray-700"
            >
              <Copy className="h-3 w-3 mr-1" />
              复制
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadAsText}
              className="text-gray-500 hover:text-gray-700"
            >
              <Download className="h-3 w-3 mr-1" />
              下载
            </Button>
          </>
        )}
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>正在生成回答...</span>
        </div>
      )}
    </div>
  );
}