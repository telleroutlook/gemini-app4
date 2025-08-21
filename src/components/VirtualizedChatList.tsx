import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EnhancedMessageBubble } from './EnhancedMessageBubble';
import type { Message, ConversationConfig } from '../types/chat';

interface VirtualizedChatListProps {
  messages: Message[];
  onStopGeneration?: () => void;
  isStreaming: boolean;
  streamingMessage?: string;
  isMobile?: boolean;
  conversationConfig?: ConversationConfig;
}

interface VirtualItem {
  index: number;
  height: number;
  offsetTop: number;
}

const ESTIMATED_MESSAGE_HEIGHT = 120; // Estimated height per message
const BUFFER_SIZE = 5; // Number of items to render outside viewport
const SCROLL_DEBOUNCE_MS = 16; // ~60fps

export const VirtualizedChatList = React.memo(function VirtualizedChatList({
  messages,
  onStopGeneration,
  isStreaming,
  streamingMessage,
  isMobile = false,
  conversationConfig
}: VirtualizedChatListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate virtual items based on current scroll position
  const virtualItems = useMemo(() => {
    if (!containerHeight || messages.length === 0) return [];

    const items: VirtualItem[] = [];
    let offsetTop = 0;

    for (let i = 0; i < messages.length; i++) {
      const height = itemHeights.get(i) || ESTIMATED_MESSAGE_HEIGHT;
      items.push({
        index: i,
        height,
        offsetTop
      });
      offsetTop += height;
    }

    return items;
  }, [messages.length, containerHeight, itemHeights]);

  // Calculate which items should be visible
  const visibleItems = useMemo(() => {
    if (virtualItems.length === 0) return [];

    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    let startIndex = 0;
    let endIndex = virtualItems.length - 1;

    // Find first visible item
    for (let i = 0; i < virtualItems.length; i++) {
      const item = virtualItems[i];
      if (item.offsetTop + item.height >= viewportTop) {
        startIndex = Math.max(0, i - BUFFER_SIZE);
        break;
      }
    }

    // Find last visible item
    for (let i = startIndex; i < virtualItems.length; i++) {
      const item = virtualItems[i];
      if (item.offsetTop > viewportBottom) {
        endIndex = Math.min(virtualItems.length - 1, i + BUFFER_SIZE);
        break;
      }
    }

    return virtualItems.slice(startIndex, endIndex + 1);
  }, [virtualItems, scrollTop, containerHeight]);

  // Total height of all items
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((sum, item) => sum + item.height, 0);
  }, [virtualItems]);

  // Handle scroll with debouncing
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setScrollTop(target.scrollTop);
    }, SCROLL_DEBOUNCE_MS);
  }, []);

  // Measure item heights and update cache
  const measureHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newMap = new Map(prev);
      if (newMap.get(index) !== height) {
        newMap.set(index, height);
        return newMap;
      }
      return prev;
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = 
        container.scrollTop + container.clientHeight >= 
        container.scrollHeight - 200; // Within 200px of bottom

      // Only auto-scroll if user is near bottom
      if (isNearBottom || messages.length === 1) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }, 0);
      }
    }
  }, [messages.length]);

  // Observe container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Update scroll position when streaming
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [isStreaming, streamingMessage, scrollToBottom]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      onScroll={handleScroll}
      style={{ height: '100%' }}
    >
      {/* Virtual container with total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((virtualItem) => {
          const message = messages[virtualItem.index];
          const isLastMessage = virtualItem.index === messages.length - 1;
          
          return (
            <VirtualMessageItem
              key={`${message.id}-${virtualItem.index}`}
              message={message}
              style={{
                position: 'absolute',
                top: virtualItem.offsetTop,
                left: 0,
                right: 0,
                minHeight: virtualItem.height
              }}
              onHeightChange={(height) => measureHeight(virtualItem.index, height)}
              isMobile={isMobile}
              isStreaming={isStreaming && isLastMessage}
              streamingContent={isLastMessage ? streamingMessage : undefined}
              conversationConfig={conversationConfig}
              onStopGeneration={onStopGeneration}
            />
          );
        })}
      </div>
    </div>
  );
});

interface VirtualMessageItemProps {
  message: Message;
  style: React.CSSProperties;
  onHeightChange: (height: number) => void;
  isMobile: boolean;
  isStreaming: boolean;
  streamingContent?: string;
  conversationConfig?: ConversationConfig;
  onStopGeneration?: () => void;
}

const VirtualMessageItem = React.memo(function VirtualMessageItem({
  message,
  style,
  onHeightChange,
  isMobile,
  isStreaming,
  streamingContent,
  conversationConfig,
  onStopGeneration
}: VirtualMessageItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Measure height changes
  useEffect(() => {
    if (!itemRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        onHeightChange(entry.contentRect.height);
      }
    });

    resizeObserver.observe(itemRef.current);
    
    return () => resizeObserver.disconnect();
  }, [onHeightChange]);

  return (
    <div ref={itemRef} style={style}>
      <EnhancedMessageBubble
        message={message}
        isMobile={isMobile}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        conversationConfig={conversationConfig}
        onStopGeneration={onStopGeneration}
      />
    </div>
  );
});