import { 
  useTransition, 
  useDeferredValue, 
  startTransition, 
  useCallback,
  useMemo,
  useOptimistic
} from 'react';
import { useSmartCache } from '../utils/smartCache';
import type { Message, ConversationConfig } from '../types/chat';

interface OptimisticMessage extends Message {
  status?: 'sending' | 'sent' | 'error';
  tempId?: string;
}

/**
 * 高性能并发聊天Hook
 * 利用React 19的并发特性优化聊天体验
 */
export function useConcurrentChat(initialMessages: Message[] = []) {
  const [isPending, startTransition] = useTransition();
  const { get: getCached, set: setCache } = useSmartCache<Message[]>();
  
  // 延迟处理非关键更新
  const deferredMessages = useDeferredValue(initialMessages);
  
  // 乐观更新支持
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    deferredMessages,
    (state: Message[], optimisticValue: OptimisticMessage) => [
      ...state,
      optimisticValue
    ]
  );

  // 智能消息缓存
  const cacheKey = useMemo(() => 
    `messages_${optimisticMessages.length}_${Date.now()}`, 
    [optimisticMessages.length]
  );

  // 并发消息发送
  const sendMessageConcurrent = useCallback(async (
    content: string,
    config?: ConversationConfig
  ) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 立即添加乐观消息（高优先级更新）
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
      tempId
    };
    
    addOptimisticMessage(optimisticMessage);
    
    // 延迟网络请求（低优先级更新）
    startTransition(async () => {
      try {
        // 模拟API调用
        const response = await sendMessageToAPI(content, config);
        
        // 更新消息状态
        const finalMessage: Message = {
          ...optimisticMessage,
          id: response.id,
          status: 'sent'
        };
        
        // 缓存响应
        setCache(cacheKey, [...optimisticMessages, finalMessage]);
        
        return finalMessage;
      } catch (error) {
        // 错误处理
        const errorMessage: OptimisticMessage = {
          ...optimisticMessage,
          status: 'error'
        };
        
        addOptimisticMessage(errorMessage);
        throw error;
      }
    });
    
    return tempId;
  }, [addOptimisticMessage, optimisticMessages, setCache, cacheKey]);

  // 批量消息处理
  const batchProcessMessages = useCallback((
    messages: Message[],
    processor: (msg: Message) => Message
  ) => {
    startTransition(() => {
      const processedMessages = messages.map(processor);
      setCache(`batch_${Date.now()}`, processedMessages);
    });
  }, [setCache]);

  // 流式消息处理
  const processStreamingMessage = useCallback((
    partialContent: string,
    messageId: string
  ) => {
    // 使用调度器优化流式更新
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      (window as any).scheduler.postTask(() => {
        startTransition(() => {
          // 更新流式消息内容
          const updatedMessages = optimisticMessages.map(msg =>
            msg.id === messageId 
              ? { ...msg, content: msg.content + partialContent }
              : msg
          );
          setCache(`streaming_${messageId}`, updatedMessages);
        });
      }, { priority: 'user-visible' });
    } else {
      // 降级处理
      startTransition(() => {
        const updatedMessages = optimisticMessages.map(msg =>
          msg.id === messageId 
            ? { ...msg, content: msg.content + partialContent }
            : msg
        );
        setCache(`streaming_${messageId}`, updatedMessages);
      });
    }
  }, [optimisticMessages, setCache]);

  // 消息搜索优化
  const searchMessages = useCallback((
    query: string,
    options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
  ) => {
    const cacheKey = `search_${query}_${JSON.stringify(options)}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const results = deferredMessages.filter(message => {
      let searchText = message.content;
      let searchQuery = query;
      
      if (!options.caseSensitive) {
        searchText = searchText.toLowerCase();
        searchQuery = searchQuery.toLowerCase();
      }
      
      if (options.wholeWord) {
        const regex = new RegExp(`\\b${searchQuery}\\b`, 'gi');
        return regex.test(searchText);
      }
      
      return searchText.includes(searchQuery);
    });
    
    // 缓存搜索结果
    setCache(cacheKey, results, 5 * 60 * 1000); // 5分钟TTL
    
    return results;
  }, [deferredMessages, getCached, setCache]);

  // 性能监控
  const getPerformanceMetrics = useCallback(() => {
    return {
      messagesCount: optimisticMessages.length,
      isPending,
      cacheSize: getCached(cacheKey)?.length || 0,
      lastUpdate: Date.now()
    };
  }, [optimisticMessages.length, isPending, getCached, cacheKey]);

  return {
    messages: optimisticMessages,
    sendMessage: sendMessageConcurrent,
    batchProcessMessages,
    processStreamingMessage,
    searchMessages,
    isPending,
    getPerformanceMetrics
  };
}

/**
 * 模拟API调用（实际项目中替换为真实的API调用）
 */
async function sendMessageToAPI(
  content: string, 
  config?: ConversationConfig
): Promise<{ id: string; content: string }> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  // 模拟响应
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: `Echo: ${content}`
  };
}

/**
 * 消息虚拟化Hook
 * 优化大量消息的渲染性能
 */
export function useVirtualizedMessages(
  messages: Message[],
  containerHeight: number,
  itemHeight: number = 100
) {
  const deferredMessages = useDeferredValue(messages);
  
  const virtualItems = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // 缓冲区
    const startIndex = Math.max(0, deferredMessages.length - visibleCount);
    
    return deferredMessages.slice(startIndex).map((message, index) => ({
      index: startIndex + index,
      message,
      top: (startIndex + index) * itemHeight,
      height: itemHeight
    }));
  }, [deferredMessages, containerHeight, itemHeight]);
  
  const totalHeight = deferredMessages.length * itemHeight;
  
  return {
    virtualItems,
    totalHeight,
    visibleCount: virtualItems.length
  };
}