import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { Conversation, Message, ConversationConfig } from '../types/chat';

interface AppState {
  // UI State
  sidebarOpen: boolean;
  apiKeyModalOpen: boolean;
  advancedSettingsOpen: boolean;
  performanceMonitorOpen: boolean;
  
  // Chat State
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  
  // Configuration
  apiKeys: string[];
  selectedModel: string;
  defaultConversationConfig: ConversationConfig;
  
  // Performance
  lastActivity: number;
  
  // Actions
  actions: {
    // UI Actions
    setSidebarOpen: (open: boolean) => void;
    setApiKeyModalOpen: (open: boolean) => void;
    setAdvancedSettingsOpen: (open: boolean) => void;
    setPerformanceMonitorOpen: (open: boolean) => void;
    
    // Chat Actions
    setConversations: (conversations: Conversation[]) => void;
    addConversation: (conversation: Conversation) => void;
    updateConversation: (id: string, updates: Partial<Conversation>) => void;
    removeConversation: (id: string) => void;
    setCurrentConversationId: (id: string | null) => void;
    
    // Messages
    addMessage: (conversationId: string, message: Message) => void;
    updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
    
    // Loading States
    setIsLoading: (loading: boolean) => void;
    setIsStreaming: (streaming: boolean) => void;
    setStreamingMessage: (message: string) => void;
    
    // Configuration
    setApiKeys: (keys: string[]) => void;
    setSelectedModel: (model: string) => void;
    setDefaultConversationConfig: (config: ConversationConfig) => void;
    
    // Performance
    updateActivity: () => void;
    
    // Batch Actions for Performance
    batchUpdate: (updates: (state: AppState) => void) => void;
  };
}

// Default configuration
const defaultConfig: ConversationConfig = {
  thinkingConfig: {
    enabled: true,
    budget: 15000,
    showThinkingProcess: false,
  },
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1000000,
  },
  groundingConfig: {
    enabled: true,
    useGoogleSearch: true,
    maxResults: 5,
  },
  urlContextConfig: {
    enabled: false,
    maxUrls: 3,
  },
  streamingEnabled: true,
  typewriterEffect: true,
  smartLoadingIndicators: true,
  realtimeFeedback: true,
};\n\nexport const useAppStore = create<AppState>()(
  subscribeWithSelector(\n    immer(\n      persist(\n        (set, get) => ({\n          // Initial State\n          sidebarOpen: false,\n          apiKeyModalOpen: false,\n          advancedSettingsOpen: false,\n          performanceMonitorOpen: false,\n          \n          conversations: [],\n          currentConversationId: null,\n          isLoading: false,\n          isStreaming: false,\n          streamingMessage: '',\n          \n          apiKeys: [],\n          selectedModel: 'gemini-2.0-flash',\n          defaultConversationConfig: defaultConfig,\n          \n          lastActivity: Date.now(),\n          \n          actions: {\n            // UI Actions\n            setSidebarOpen: (open) => set((state) => {\n              state.sidebarOpen = open;\n            }),\n            \n            setApiKeyModalOpen: (open) => set((state) => {\n              state.apiKeyModalOpen = open;\n            }),\n            \n            setAdvancedSettingsOpen: (open) => set((state) => {\n              state.advancedSettingsOpen = open;\n            }),\n            \n            setPerformanceMonitorOpen: (open) => set((state) => {\n              state.performanceMonitorOpen = open;\n            }),\n            \n            // Chat Actions\n            setConversations: (conversations) => set((state) => {\n              state.conversations = conversations;\n            }),\n            \n            addConversation: (conversation) => set((state) => {\n              state.conversations.unshift(conversation);\n            }),\n            \n            updateConversation: (id, updates) => set((state) => {\n              const index = state.conversations.findIndex(c => c.id === id);\n              if (index !== -1) {\n                Object.assign(state.conversations[index], updates);\n              }\n            }),\n            \n            removeConversation: (id) => set((state) => {\n              state.conversations = state.conversations.filter(c => c.id !== id);\n              if (state.currentConversationId === id) {\n                state.currentConversationId = null;\n              }\n            }),\n            \n            setCurrentConversationId: (id) => set((state) => {\n              state.currentConversationId = id;\n            }),\n            \n            // Messages\n            addMessage: (conversationId, message) => set((state) => {\n              const conversation = state.conversations.find(c => c.id === conversationId);\n              if (conversation) {\n                conversation.messages.push(message);\n                conversation.updatedAt = new Date();\n              }\n            }),\n            \n            updateMessage: (conversationId, messageId, updates) => set((state) => {\n              const conversation = state.conversations.find(c => c.id === conversationId);\n              if (conversation) {\n                const message = conversation.messages.find(m => m.id === messageId);\n                if (message) {\n                  Object.assign(message, updates);\n                  conversation.updatedAt = new Date();\n                }\n              }\n            }),\n            \n            // Loading States\n            setIsLoading: (loading) => set((state) => {\n              state.isLoading = loading;\n              if (loading) state.lastActivity = Date.now();\n            }),\n            \n            setIsStreaming: (streaming) => set((state) => {\n              state.isStreaming = streaming;\n              if (streaming) state.lastActivity = Date.now();\n            }),\n            \n            setStreamingMessage: (message) => set((state) => {\n              state.streamingMessage = message;\n              state.lastActivity = Date.now();\n            }),\n            \n            // Configuration\n            setApiKeys: (keys) => set((state) => {\n              state.apiKeys = keys;\n            }),\n            \n            setSelectedModel: (model) => set((state) => {\n              state.selectedModel = model;\n            }),\n            \n            setDefaultConversationConfig: (config) => set((state) => {\n              state.defaultConversationConfig = config;\n            }),\n            \n            // Performance\n            updateActivity: () => set((state) => {\n              state.lastActivity = Date.now();\n            }),\n            \n            // Batch Updates\n            batchUpdate: (updates) => set((state) => {\n              updates(state);\n              state.lastActivity = Date.now();\n            })\n          }\n        }),\n        {\n          name: 'gemini-app-store',\n          // Only persist essential data\n          partialize: (state) => ({\n            apiKeys: state.apiKeys,\n            selectedModel: state.selectedModel,\n            defaultConversationConfig: state.defaultConversationConfig,\n            currentConversationId: state.currentConversationId,\n          }),\n          version: 1,\n        }\n      )\n    )\n  )\n);\n\n// Selectors for optimized component subscriptions\nexport const useUIState = () => useAppStore((state) => ({\n  sidebarOpen: state.sidebarOpen,\n  apiKeyModalOpen: state.apiKeyModalOpen,\n  advancedSettingsOpen: state.advancedSettingsOpen,\n  performanceMonitorOpen: state.performanceMonitorOpen\n}));\n\nexport const useChatState = () => useAppStore((state) => ({\n  conversations: state.conversations,\n  currentConversationId: state.currentConversationId,\n  isLoading: state.isLoading,\n  isStreaming: state.isStreaming,\n  streamingMessage: state.streamingMessage\n}));\n\nexport const useConfigState = () => useAppStore((state) => ({\n  apiKeys: state.apiKeys,\n  selectedModel: state.selectedModel,\n  defaultConversationConfig: state.defaultConversationConfig\n}));\n\nexport const useUIActions = () => useAppStore((state) => ({\n  setSidebarOpen: state.actions.setSidebarOpen,\n  setApiKeyModalOpen: state.actions.setApiKeyModalOpen,\n  setAdvancedSettingsOpen: state.actions.setAdvancedSettingsOpen,\n  setPerformanceMonitorOpen: state.actions.setPerformanceMonitorOpen\n}));\n\nexport const useChatActions = () => useAppStore((state) => ({\n  setConversations: state.actions.setConversations,\n  addConversation: state.actions.addConversation,\n  updateConversation: state.actions.updateConversation,\n  removeConversation: state.actions.removeConversation,\n  setCurrentConversationId: state.actions.setCurrentConversationId,\n  addMessage: state.actions.addMessage,\n  updateMessage: state.actions.updateMessage,\n  setIsLoading: state.actions.setIsLoading,\n  setIsStreaming: state.actions.setIsStreaming,\n  setStreamingMessage: state.actions.setStreamingMessage\n}));\n\nexport const useConfigActions = () => useAppStore((state) => ({\n  setApiKeys: state.actions.setApiKeys,\n  setSelectedModel: state.actions.setSelectedModel,\n  setDefaultConversationConfig: state.actions.setDefaultConversationConfig\n}));\n\n// Performance monitoring\nexport const usePerformanceMetrics = () => useAppStore((state) => ({\n  lastActivity: state.lastActivity,\n  conversationsCount: state.conversations.length,\n  messagesCount: state.conversations.reduce((sum, conv) => sum + conv.messages.length, 0)\n}));