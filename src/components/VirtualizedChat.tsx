import { memo, useMemo } from 'react';
import { useVirtual } from '@tanstack/react-virtual';
import type { Message } from '../types/chat';

interface VirtualizedChatProps {
  messages: Message[];
  containerHeight: number;
  renderMessage: (message: Message, index: number) => React.ReactNode;
}

export const VirtualizedChat = memo(function VirtualizedChat({
  messages,
  containerHeight,
  renderMessage
}: VirtualizedChatProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Virtualize the messages list for better performance with large datasets
  const virtualizer = useVirtual({
    size: messages.length,
    parentRef,
    estimateSize: React.useCallback((index: number) => {
      // Dynamic size estimation based on message content
      const message = messages[index];
      if (!message) return 80;
      
      // Estimate height based on content length and type
      const baseHeight = 60;
      const contentLength = message.content.length;
      const extraHeight = Math.min(contentLength / 50, 200); // Max 200px extra
      
      return baseHeight + extraHeight;
    }, [messages]),
    overscan: 5, // Render 5 extra items outside viewport
  });

  // Memoize virtual items to prevent unnecessary recalculation
  const virtualItems = useMemo(() => virtualizer.virtualItems, [virtualizer.virtualItems]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, virtualizer]);

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${virtualizer.totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderMessage(message, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
});