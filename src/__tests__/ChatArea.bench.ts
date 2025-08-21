import { bench, describe } from 'vitest';
import { render } from '@testing-library/react';
import { ChatArea } from '../src/components/ChatArea';
import type { Message, ConversationConfig } from '../src/types/chat';

// Mock heavy components
vi.mock('../src/components/EnhancedMessageBubble', () => ({
  EnhancedMessageBubble: ({ message }: { message: Message }) => (
    <div>{message.content}</div>
  ),
}));

vi.mock('../src/components/ChatInput', () => ({
  ChatInput: () => <div>Chat Input</div>,
}));

// Generate test messages
const generateMessages = (count: number): Message[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `message-${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `This is test message number ${i}. `.repeat(10), // Longer content
    timestamp: new Date(Date.now() - (count - i) * 1000),
  })) as Message[];
};

const defaultProps = {
  onSendMessage: () => {},
  onGenerateImage: () => {},
  onStopGeneration: () => {},
  isLoading: false,
  isStreaming: false,
  streamingMessage: '',
  hasApiKey: true,
  isMobile: false,
  conversationConfig: {} as ConversationConfig,
};

describe('ChatArea Performance Benchmarks', () => {
  bench('render ChatArea with 10 messages', () => {
    const messages = generateMessages(10);
    render(<ChatArea {...defaultProps} messages={messages} />);
  }, { iterations: 100 });

  bench('render ChatArea with 50 messages', () => {
    const messages = generateMessages(50);
    render(<ChatArea {...defaultProps} messages={messages} />);
  }, { iterations: 50 });

  bench('render ChatArea with 100 messages', () => {
    const messages = generateMessages(100);
    render(<ChatArea {...defaultProps} messages={messages} />);
  }, { iterations: 20 });

  bench('render ChatArea with 500 messages', () => {
    const messages = generateMessages(500);
    render(<ChatArea {...defaultProps} messages={messages} />);
  }, { iterations: 5 });

  bench('re-render ChatArea with same messages (memoization test)', () => {
    const messages = generateMessages(100);
    const { rerender } = render(<ChatArea {...defaultProps} messages={messages} />);
    
    // This should be fast due to React.memo and useMemo optimizations
    rerender(<ChatArea {...defaultProps} messages={messages} isLoading={true} />);
  }, { iterations: 100 });
});

describe('Message Processing Benchmarks', () => {
  bench('process message list with useMemo', () => {
    const messages = generateMessages(1000);
    
    // Simulate the useMemo processing
    const processedMessages = React.useMemo(() => {
      return messages.filter(msg => msg.content.length > 10);
    }, [messages]);
    
    return processedMessages;
  }, { iterations: 50 });

  bench('scroll position calculation', () => {
    const messages = generateMessages(200);
    
    // Simulate scroll calculations
    const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null;
    const isStreaming = true;
    
    messages.forEach(message => {
      const isMessageStreaming = isStreaming && message.id === lastMessageId && message.role === 'assistant';
      return isMessageStreaming;
    });
  }, { iterations: 100 });
});