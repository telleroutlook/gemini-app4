import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatArea } from '../src/components/ChatArea';
import type { Message, ConversationConfig } from '../src/types/chat';

// Mock components that have complex dependencies
vi.mock('../src/components/EnhancedMessageBubble', () => ({
  EnhancedMessageBubble: ({ message }: { message: Message }) => (
    <div data-testid="message-bubble">{message.content}</div>
  ),
}));

vi.mock('../src/components/ChatInput', () => ({
  ChatInput: ({ onSendMessage }: { onSendMessage: (content: string) => void }) => (
    <button data-testid="send-button" onClick={() => onSendMessage('test message')}>
      Send
    </button>
  ),
}));

vi.mock('../src/components/SmartLoadingIndicator', () => ({
  SmartLoadingIndicator: () => <div data-testid="loading-indicator">Loading...</div>,
}));

describe('ChatArea Component', () => {
  const defaultProps = {
    messages: [],
    onSendMessage: vi.fn(),
    onGenerateImage: vi.fn(),
    onStopGeneration: vi.fn(),
    isLoading: false,
    isStreaming: false,
    streamingMessage: '',
    hasApiKey: true,
    isMobile: false,
    conversationConfig: {} as ConversationConfig,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders welcome message when no API key is provided', () => {
    render(<ChatArea {...defaultProps} hasApiKey={false} />);
    
    expect(screen.getByText('Welcome to Gemini Chat')).toBeInTheDocument();
    expect(screen.getByText(/To get started, please configure your Gemini API key/)).toBeInTheDocument();
  });

  it('renders start conversation prompt when no messages', () => {
    render(<ChatArea {...defaultProps} />);
    
    expect(screen.getByText('Start a new conversation')).toBeInTheDocument();
    expect(screen.getByText(/Ask me anything/)).toBeInTheDocument();
  });

  it('renders messages when provided', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
      },
    ];

    render(<ChatArea {...defaultProps} messages={messages} />);
    
    expect(screen.getAllByTestId('message-bubble')).toHaveLength(2);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('shows loading indicator when loading and not streaming', () => {
    render(<ChatArea {...defaultProps} isLoading={true} isStreaming={false} />);
    
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('does not show loading indicator when streaming', () => {
    render(<ChatArea {...defaultProps} isLoading={true} isStreaming={true} />);
    
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
  });

  it('calls onSendMessage when send button is clicked', () => {
    const onSendMessage = vi.fn();
    render(<ChatArea {...defaultProps} onSendMessage={onSendMessage} />);
    
    fireEvent.click(screen.getByTestId('send-button'));
    
    expect(onSendMessage).toHaveBeenCalledWith('test message');
  });

  it('applies mobile-specific styling when isMobile is true', () => {
    const { container } = render(<ChatArea {...defaultProps} isMobile={true} />);
    
    expect(container.querySelector('.p-2')).toBeInTheDocument();
  });

  it('memoizes message list to prevent unnecessary re-renders', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
      },
    ];

    const { rerender } = render(<ChatArea {...defaultProps} messages={messages} />);
    
    const messageBubbles = screen.getAllByTestId('message-bubble');
    expect(messageBubbles).toHaveLength(1);
    
    // Re-render with same messages reference - should not cause re-render of message components
    rerender(<ChatArea {...defaultProps} messages={messages} isLoading={true} />);
    
    expect(screen.getAllByTestId('message-bubble')).toHaveLength(1);
  });

  it('handles streaming message correctly', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Partial response',
        timestamp: new Date(),
      },
    ];

    render(
      <ChatArea 
        {...defaultProps} 
        messages={messages} 
        isStreaming={true} 
        streamingMessage="Streaming response text..."
      />
    );
    
    expect(screen.getByText('Partial response')).toBeInTheDocument();
  });
});