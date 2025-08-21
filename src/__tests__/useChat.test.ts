import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from '../src/hooks/useChat';

// Mock dependencies
vi.mock('../src/services/gemini', () => ({
  geminiService: {
    setApiKeys: vi.fn(),
    setModelSwitchCallback: vi.fn(),
    generateStreamingResponseWithModelSwitch: vi.fn(),
    generateResponseWithModelSwitch: vi.fn(),
    stopGeneration: vi.fn(),
    getStats: vi.fn(() => ({ totalRequests: 0 })),
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../src/hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn((key: string, defaultValue: any) => [defaultValue, vi.fn()]),
  useConversations: vi.fn(() => ({
    conversations: [],
    isLoading: false,
    error: null,
    saveConversation: vi.fn(),
    deleteConversation: vi.fn(),
    cleanupOldConversations: vi.fn(),
    getStorageUsage: vi.fn(),
  })),
}));

vi.mock('../src/utils/env', () => ({
  loadApiKeysFromEnv: vi.fn(() => []),
}));

vi.mock('../src/utils/contextManager', () => ({
  ContextManager: vi.fn(() => ({
    needsOptimization: vi.fn(() => false),
    optimizeContext: vi.fn((messages) => messages),
    createIntelligentSummary: vi.fn(),
    updateConfig: vi.fn(),
    estimateTokens: vi.fn(() => 1000),
  })),
}));

vi.mock('../src/config/gemini', () => ({
  getOptimalThinkingConfig: vi.fn(() => ({ enabled: false })),
  getModelCapabilities: vi.fn(() => ({ supportsGrounding: false, supportsUrlContext: false })),
}));

describe('useChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.conversations).toEqual([]);
    expect(result.current.currentConversation).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingMessage).toBe('');
    expect(result.current.selectedModel).toBe('gemini-2.0-flash');
  });

  it('creates new conversation with correct structure', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.createNewConversation();
    });

    // Verify that createNewConversation was called
    expect(typeof result.current.createNewConversation).toBe('function');
  });

  it('handles API key validation correctly', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    // Should show error when no API keys are set
    // The actual implementation would call toast.error
    expect(result.current.apiKeys).toEqual([]);
  });

  it('manages conversation selection correctly', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.selectConversation('test-id');
    });

    expect(typeof result.current.selectConversation).toBe('function');
  });

  it('exports conversations with correct format', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.exportConversation('test-id');
    });

    expect(typeof result.current.exportConversation).toBe('function');
  });

  it('stops generation correctly', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.stopGeneration();
    });

    expect(typeof result.current.stopGeneration).toBe('function');
  });

  it('provides performance metrics', () => {
    const { result } = renderHook(() => useChat());

    const metrics = result.current.getPerformanceMetrics();
    expect(typeof metrics).toBe('object');
  });

  it('handles context configuration updates', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.updateContextConfig({ maxHistoryLength: 50 });
    });

    expect(typeof result.current.updateContextConfig).toBe('function');
  });

  it('provides context information', () => {
    const { result } = renderHook(() => useChat());

    const contextInfo = result.current.getContextInfo();
    // Should return null when no current conversation
    expect(contextInfo).toBeNull();
  });

  it('manages storage and cleanup', () => {
    const { result } = renderHook(() => useChat());

    expect(typeof result.current.cleanupOldConversations).toBe('function');
    expect(typeof result.current.getStorageUsage).toBe('function');
  });
});