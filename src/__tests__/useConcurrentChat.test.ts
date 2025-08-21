import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConcurrentChat } from '../hooks/useConcurrentChat';
import type { Message } from '../types/chat';

// Mock the smart cache
vi.mock('../utils/smartCache', () => ({
  useSmartCache: () => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    stats: { entries: 0, size: 0, utilization: '0%' }
  })
}));

describe('useConcurrentChat', () => {
  const mockMessages: Message[] = [
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

  it('should initialize with provided messages', () => {
    const { result } = renderHook(() => useConcurrentChat(mockMessages));
    
    expect(result.current.messages).toEqual(mockMessages);
  });

  it('should handle optimistic message sending', async () => {
    const { result } = renderHook(() => useConcurrentChat([]));
    
    await act(async () => {
      const tempId = await result.current.sendMessage('Test message');
      expect(tempId).toMatch(/^temp_/);
    });
    
    // Should have added optimistic message
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Test message');
  });

  it('should search messages correctly', () => {
    const { result } = renderHook(() => useConcurrentChat(mockMessages));
    
    const results = result.current.searchMessages('Hello');
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('Hello');
  });

  it('should provide performance metrics', () => {
    const { result } = renderHook(() => useConcurrentChat(mockMessages));
    
    const metrics = result.current.getPerformanceMetrics();
    expect(metrics).toHaveProperty('messagesCount');
    expect(metrics).toHaveProperty('isPending');
    expect(metrics.messagesCount).toBe(2);
  });

  it('should handle case-insensitive search', () => {
    const { result } = renderHook(() => useConcurrentChat(mockMessages));
    
    const results = result.current.searchMessages('HELLO', { caseSensitive: false });
    expect(results).toHaveLength(1);
  });

  it('should handle whole word search', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user', 
        content: 'Helloing around',
        timestamp: new Date(),
      },
    ];

    const { result } = renderHook(() => useConcurrentChat(testMessages));
    
    const results = result.current.searchMessages('Hello', { wholeWord: true });
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('Hello world');
  });
});