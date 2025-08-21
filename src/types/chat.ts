export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: FileAttachment[];
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  tokenUsage?: {
    input: number;
    output: number;
    thinking?: number;
  };
  responseTime?: number;
  modelUsed?: string;
  thinkingEnabled?: boolean;
  groundingMetadata?: GroundingMetadata;
  urlContextMetadata?: UrlContextMetadata;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  data?: string; // base64 for images, videos, and PDFs
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
  config?: ConversationConfig;
}

export interface ConversationConfig {
  systemInstruction?: string;
  thinkingConfig?: ThinkingConfig;
  generationConfig?: GenerationConfig;
  groundingConfig?: GroundingConfig;
  urlContextConfig?: UrlContextConfig;
  // Interface settings
  streamingEnabled?: boolean;
  typewriterEffect?: boolean;
  smartLoadingIndicators?: boolean;
  realtimeFeedback?: boolean;
}

export interface GroundingConfig {
  enabled: boolean;
  useGoogleSearch: boolean;
  searchQueries?: string[];
  maxResults?: number;
}

export interface UrlContextConfig {
  enabled: boolean;
  urls?: string[];
  maxUrls?: number;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent: string;
  };
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
  groundingSupports?: Array<{
    segment?: {
      startIndex: number;
      endIndex: number;
      text: string;
    };
    groundingChunkIndices?: number[];
  }>;
}

export interface UrlContextMetadata {
  urlMetadata?: Array<{
    retrievedUrl: string;
    urlRetrievalStatus: string;
  }>;
}

export interface ThinkingConfig {
  enabled: boolean;
  budget: number;
  showThinkingProcess?: boolean;
}

export interface GenerationConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
  responseMimeType?: string;
}

export interface ImageGenerationConfig {
  numberOfImages: number;
  sampleImageSize: '1K' | '2K';
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  personGeneration: 'dont_allow' | 'allow_adult' | 'allow_all';
  safetyFilterLevel?: 'block_most' | 'block_some' | 'block_few' | 'block_none';
  seed?: number;
  enhancePrompt?: boolean;
}


export interface GeminiModel {
  id: string;
  name: string;
  description: string;
  supportsVision: boolean;
  supportsAudio?: boolean;
  supportsVideo?: boolean;
  supportsPdf?: boolean;
  supportsImageGeneration?: boolean;
  supportsLive?: boolean;
  supportsThinking?: boolean;
  maxTokens: number;
  costTier?: 'free' | 'low' | 'medium' | 'high';
}

export interface PerformanceMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  successRate: string;
  uptime: number;
  currentKeyIndex: number;
  totalKeys: number;
  healthyKeys: number;
  timestamp: string;
  keyStats: KeyHealthStats[];
}

export interface KeyHealthStats {
  keyIndex: number;
  successCount: number;
  errorCount: number;
  successRate: string;
  lastUsed: string | Date;
  lastError?: string;
  consecutiveErrors: number;
  isHealthy: boolean;
}

// 用户管理相关类型
export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  lastUsed: Date;
}