import React, { useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { EnhancedMessageBubble } from './EnhancedMessageBubble';
import { ChatInput } from './ChatInput';
import { SmartLoadingIndicator } from './SmartLoadingIndicator';
import type { Message, FileAttachment, ConversationConfig } from '../types/chat';
import { Bot, Sparkles } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, files?: FileAttachment[]) => void;
  onGenerateImage?: (content: string, files?: FileAttachment[]) => void;
  onStopGeneration?: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessage?: string;
  hasApiKey: boolean;
  isMobile?: boolean;
  conversationConfig?: ConversationConfig;
}

export const ChatArea = memo(function ChatArea({ 
  messages, 
  onSendMessage, 
  onGenerateImage, 
  onStopGeneration,
  isLoading, 
  isStreaming,
  streamingMessage,
  hasApiKey, 
  isMobile = false,
  conversationConfig
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoized scroll function with debouncing for better performance
  const scrollToBottom = useCallback(() => {
    const element = messagesEndRef.current;
    if (element) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, streamingMessage, scrollToBottom]);

  // Memoize messages list to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  // Memoize last message check for streaming
  const lastMessageId = useMemo(() => {
    return messages.length > 0 ? messages[messages.length - 1]?.id : null;
  }, [messages]);

  // Memoized streaming check
  const isMessageStreaming = useCallback((messageId: string, role: string) => {
    return isStreaming && messageId === lastMessageId && role === 'assistant';
  }, [isStreaming, lastMessageId]);

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto p-4 sm:p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Welcome to Gemini Chat
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              To get started, please configure your Gemini API key using the settings in the sidebar.
            </p>
            <div className="text-xs sm:text-sm text-gray-500">
              <p>Features available:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Real-time AI conversations</li>
                <li>Image and document uploads</li>
                <li>Conversation history</li>
                <li>Multiple Gemini models</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto p-4 sm:p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Start a new conversation
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Ask me anything! I can help with questions, analysis, creative tasks, and more.
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
              <div className="p-3 bg-gray-50 rounded-lg text-left">
                <p className="font-medium text-gray-700">💡 Example prompts:</p>
                <ul className="mt-1 text-gray-600 space-y-1">
                  <li>• "Explain quantum computing"</li>
                  <li>• "Write a Python function to..."</li>
                  <li>• "Analyze this image" (with upload)</li>
                  <li>• "Generate an image of..." (image generation)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <ChatInput
          onSendMessage={onSendMessage}
          onGenerateImage={onGenerateImage}
          isLoading={isLoading}
          isMobile={isMobile}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        {memoizedMessages.map((message) => (
          <EnhancedMessageBubble 
            key={message.id} 
            message={message} 
            isMobile={isMobile}
            isStreaming={isMessageStreaming(message.id, message.role)}
            conversationConfig={conversationConfig}
            onStopGeneration={onStopGeneration}
            streamingContent={isMessageStreaming(message.id, message.role) ? streamingMessage : undefined}
          />
        ))}
        
        {/* Loading Indicator - only show when not streaming */}
        {isLoading && !isStreaming && (
          <SmartLoadingIndicator
            isLoading={isLoading}
            isStreaming={isStreaming}
            messageContent={messages[messages.length - 1]?.content || ''}
            requestType="text"
            enableSmartIndicators={conversationConfig?.smartLoadingIndicators}
            enableRealtimeFeedback={conversationConfig?.realtimeFeedback}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={onSendMessage}
        onGenerateImage={onGenerateImage}
        isLoading={isLoading}
        isMobile={isMobile}
      />
    </div>
  );
});