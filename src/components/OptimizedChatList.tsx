import React, { memo, useMemo, useCallback, startTransition, Suspense } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useConcurrentChat } from '../hooks/useConcurrentChat';
import { useOptimizedContentRenderer } from '../hooks/useWebWorker';
import type { Message } from '../types/chat';

interface OptimizedChatListProps {
  messages: Message[];
  containerHeight: number;
  onMessageUpdate?: (messageId: string, updates: Partial<Message>) => void;
  className?: string;
}

/**
 * 高性能聊天消息列表组件
 * 使用虚拟化、并发特性和Web Worker优化
 */
export const OptimizedChatList = memo<OptimizedChatListProps>(function OptimizedChatList({
  messages,
  containerHeight,
  onMessageUpdate,
  className = ''
}) {
  const { processStreamingMessage } = useConcurrentChat(messages);
  const { renderContent, isProcessing } = useOptimizedContentRenderer();

  // 父容器引用
  const parentRef = React.useRef<HTMLDivElement>(null);

  // 虚拟化配置
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index: number) => {
      const message = messages[index];
      // 根据消息类型估算高度
      const baseHeight = 80;
      const contentLength = message.content.length;
      const estimatedContentHeight = Math.max(40, Math.min(400, contentLength / 3));
      
      // 包含代码块或图表的消息需要更多空间
      if (message.content.includes('```') || message.content.includes('mermaid')) {
        return baseHeight + estimatedContentHeight + 100;
      }
      
      return baseHeight + estimatedContentHeight;
    }, [messages]),
    overscan: 5, // 预渲染5个项目
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  // 处理消息内容渲染
  const handleContentRender = useCallback(async (message: Message) => {
    if (message.content.includes('```mermaid')) {
      const mermaidMatch = message.content.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch) {
        startTransition(() => {
          renderContent(mermaidMatch[1], 'mermaid');
        });
      }
    }

    if (message.content.includes('```')) {
      const codeMatches = message.content.match(/```(\w+)?\n([\s\S]*?)\n```/g);
      if (codeMatches) {
        codeMatches.forEach(match => {
          const [, language, code] = match.match(/```(\w+)?\n([\s\S]*?)\n```/) || [];
          startTransition(() => {
            renderContent(code || '', 'code', { language });
          });
        });
      }
    }

    if (/\$\$[\s\S]*?\$\$|\$[^$]+\$/.test(message.content)) {
      const mathMatches = message.content.match(/\$\$[\s\S]*?\$\$|\$[^$]+\$/g);
      if (mathMatches) {
        mathMatches.forEach(match => {
          const latex = match.replace(/^\$\$?|\$\$?$/g, '');
          const displayMode = match.startsWith('$$');
          startTransition(() => {
            renderContent(latex, 'math', { displayMode });
          });
        });
      }
    }
  }, [renderContent]);

  // 虚拟项目组件
  const VirtualItem = memo<{ 
    message: Message; 
    style: React.CSSProperties;
    index: number;
  }>(function VirtualItem({ message, style, index }) {
    
    // 处理内容渲染
    React.useEffect(() => {
      handleContentRender(message);
    }, [message.content, handleContentRender]);

    const handleMessageClick = useCallback(() => {
      onMessageUpdate?.(message.id, { isSelected: true });
    }, [message.id]);

    return (
      <div
        style={style}
        className={`
          virtual-message-item 
          ${message.role === 'user' ? 'user-message' : 'assistant-message'}
          ${message.isSelected ? 'selected' : ''}
          transition-colors duration-200 hover:bg-gray-50
        `}
        onClick={handleMessageClick}
        data-index={index}
      >
        <Suspense fallback={<MessageSkeleton />}>
          <MessageContent message={message} />
        </Suspense>
      </div>
    );
  });

  return (
    <div className={`optimized-chat-list ${className}`}>
      <div
        ref={parentRef}
        className="chat-list-container"
        style={{ height: containerHeight, overflow: 'auto' }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];
            
            return (
              <VirtualItem
                key={message.id}
                message={message}
                index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
      
      {isProcessing && (
        <div className="processing-indicator">
          <ProcessingIndicator />
        </div>
      )}
    </div>
  );
});

/**
 * 消息内容组件
 */
const MessageContent = memo<{ message: Message }>(function MessageContent({ message }) {
  const messageClass = useMemo(() => 
    `message-bubble ${message.role === 'user' ? 'user' : 'assistant'}`,
    [message.role]
  );

  return (
    <div className={messageClass}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? '👤' : '🤖'}
        </span>
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="message-content">
        <EnhancedContentRenderer content={message.content} />
      </div>
      
      {message.attachments && message.attachments.length > 0 && (
        <div className="message-attachments">
          {message.attachments.map((attachment, index) => (
            <AttachmentPreview key={index} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * 增强的内容渲染器
 */
const EnhancedContentRenderer = memo<{ content: string }>(function EnhancedContentRenderer({ content }) {
  const { renderContent } = useOptimizedContentRenderer();
  const [renderedHtml, setRenderedHtml] = React.useState<string>('');

  React.useEffect(() => {
    let isMounted = true;
    
    const processContent = async () => {
      try {
        const html = await renderContent(content, 'markdown');
        if (isMounted) {
          setRenderedHtml(html);
        }
      } catch (error) {
        console.error('Content rendering failed:', error);
        if (isMounted) {
          setRenderedHtml(content); // 降级显示原始内容
        }
      }
    };

    processContent();
    
    return () => {
      isMounted = false;
    };
  }, [content, renderContent]);

  if (!renderedHtml) {
    return <ContentSkeleton />;
  }

  return (
    <div 
      className="rendered-content prose max-w-none"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
});

/**
 * 消息骨架屏
 */
const MessageSkeleton = memo(function MessageSkeleton() {
  return (
    <div className="message-skeleton animate-pulse">
      <div className="skeleton-header">
        <div className="skeleton-avatar w-8 h-8 bg-gray-300 rounded-full"></div>
        <div className="skeleton-time w-16 h-4 bg-gray-300 rounded"></div>
      </div>
      <div className="skeleton-content">
        <div className="w-full h-4 bg-gray-300 rounded mb-2"></div>
        <div className="w-3/4 h-4 bg-gray-300 rounded mb-2"></div>
        <div className="w-1/2 h-4 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
});

/**
 * 内容骨架屏
 */
const ContentSkeleton = memo(function ContentSkeleton() {
  return (
    <div className="content-skeleton animate-pulse">
      <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
      <div className="w-5/6 h-4 bg-gray-200 rounded mb-2"></div>
      <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
    </div>
  );
});

/**
 * 处理指示器
 */
const ProcessingIndicator = memo(function ProcessingIndicator() {
  return (
    <div className="processing-indicator flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      <span className="text-sm text-blue-600">Processing content in background...</span>
    </div>
  );
});

/**
 * 附件预览组件
 */
const AttachmentPreview = memo<{ attachment: any }>(function AttachmentPreview({ attachment }) {
  return (
    <div className="attachment-preview">
      {attachment.type === 'image' ? (
        <img 
          src={attachment.url} 
          alt={attachment.name}
          className="max-w-xs max-h-48 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="file-attachment flex items-center space-x-2 p-2 bg-gray-100 rounded">
          <span className="file-icon">📄</span>
          <span className="file-name text-sm">{attachment.name}</span>
        </div>
      )}
    </div>
  );
});

export default OptimizedChatList;