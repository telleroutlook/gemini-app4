export const GEMINI_MODELS: Array<{
  id: string;
  name: string;
  description: string;
  supportsVision: boolean;
  maxTokens: number;
  supportsAudio?: boolean;
  supportsVideo?: boolean;
  supportsPdf?: boolean;
  supportsLive?: boolean;
  supportsThinking?: boolean;
  supportsGrounding?: boolean;
  supportsUrlContext?: boolean;
  costTier?: 'free' | 'low' | 'medium' | 'high';
}> = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Enhanced thinking and reasoning, multimodal understanding, advanced coding, and more - now in General Availability with thinking capability',
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsPdf: true,
    supportsThinking: true,
    supportsGrounding: true,
    supportsUrlContext: true,
    maxTokens: 2000000, // Updated context window for 2025
    costTier: 'high',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Adaptive thinking with cost efficiency - General Availability version with thinking budgets',
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsThinking: true,
    supportsGrounding: true,
    supportsUrlContext: true,
    maxTokens: 1000000, // Updated context window for 2025
    costTier: 'medium',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Most cost-efficient model supporting high throughput and faster processing',
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsThinking: true,
    supportsGrounding: true,
    supportsUrlContext: true,
    maxTokens: 8192,
    costTier: 'low',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Advanced multimodal model with enhanced reasoning and performance capabilities',
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsThinking: true,
    supportsGrounding: true,
    supportsUrlContext: true,
    maxTokens: 1000000,
    costTier: 'medium',
  },
  {
    id: 'gemma-3-27b-it',
    name: 'Gemma 3 27B IT',
    description: 'High-performance open-source model with 27 billion parameters, optimized for instruction-following and coding tasks',
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsThinking: false,
    supportsGrounding: false,
    supportsUrlContext: false,
    maxTokens: 8192,
    costTier: 'low',
  },
];

export const DEFAULT_MODEL = 'gemini-2.0-flash';

// Model fallback chain for intelligent switching when quota is exhausted
export const MODEL_FALLBACK_CHAINS: Record<string, string[]> = {
  'gemini-2.5-pro': [
    'gemini-2.5-flash', // Same generation, faster and cheaper
    'gemini-2.5-flash-lite', // Even more cost-effective
    'gemma-3-27b-it', // Open-source fallback
  ],
  'gemini-2.5-flash': [
    'gemini-2.5-flash-lite', // More cost-effective alternative
    'gemma-3-27b-it', // Open-source alternative
    'gemini-2.5-pro', // Upgrade if lite doesn't work
  ],
  'gemini-2.5-flash-lite': [
    'gemma-3-27b-it', // Similar cost tier, different capabilities
    'gemini-2.5-flash', // Upgrade to better performance
    'gemini-2.5-pro', // Premium fallback
  ],
  'gemini-2.0-flash': [
    'gemini-2.5-flash', // Alternative with similar capabilities
    'gemma-3-27b-it', // Open-source alternative
    'gemini-2.5-pro', // Premium alternative
  ],
  'gemma-3-27b-it': [
    'gemini-2.5-flash-lite', // Similar cost tier
    'gemini-2.5-flash', // Better multimodal support
    'gemini-2.0-flash', // Advanced features
  ],
};

// Model capability helper
export const getModelCapabilities = (modelId: string) => {
  const model = GEMINI_MODELS.find(m => m.id === modelId);
  if (!model) {
    return {
      supportsThinking: false,
      supportsGrounding: false,
      supportsUrlContext: false,
      supportsImageGeneration: false,
      maxContextTokens: 32768,
    };
  }
  
  return {
    supportsThinking: model.supportsThinking || false,
    supportsGrounding: model.supportsGrounding || false,
    supportsUrlContext: model.supportsUrlContext || false,
    maxContextTokens: model.maxTokens || 32768,
  };
};

// Get the next best model when current model fails
export const getNextBestModel = (currentModel: string): string | null => {
  const fallbackChain = MODEL_FALLBACK_CHAINS[currentModel];
  if (!fallbackChain || fallbackChain.length === 0) {
    return null;
  }
  return fallbackChain[0]; // Return the best alternative
};

// Get user-friendly explanation for model switch
export const getModelSwitchExplanation = (fromModel: string, toModel: string): string => {
  const fromModelInfo = GEMINI_MODELS.find(m => m.id === fromModel);
  const toModelInfo = GEMINI_MODELS.find(m => m.id === toModel);
  
  if (!fromModelInfo || !toModelInfo) {
    return `Switched from ${fromModel} to ${toModel} due to quota exhaustion.`;
  }
  
  const fromTier = fromModelInfo.costTier || 'medium';
  const toTier = toModelInfo.costTier || 'medium';
  
  if (fromTier === 'high' && toTier === 'medium') {
    return `Switched from ${fromModelInfo.name} to ${toModelInfo.name} for better cost efficiency while maintaining quality.`;
  } else if (fromTier === 'medium' && toTier === 'low') {
    return `Switched from ${fromModelInfo.name} to ${toModelInfo.name} for maximum cost efficiency.`;
  } else if (fromTier === 'low' && toTier === 'medium') {
    return `Upgraded from ${fromModelInfo.name} to ${toModelInfo.name} for better performance and capabilities.`;
  } else if (fromTier === 'medium' && toTier === 'high') {
    return `Upgraded to ${toModelInfo.name} for premium quality and advanced capabilities.`;
  } else {
    return `Switched to ${toModelInfo.name} for optimal performance.`;
  }
};

// Smart thinking configuration based on task type
export const getOptimalThinkingConfig = (messageContent: string, model: string) => {
  const capabilities = getModelCapabilities(model);
  
  if (!capabilities.supportsThinking) {
    return { enabled: false, budget: 0 };
  }

  // Analyze message content to determine optimal thinking budget
  const content = messageContent.toLowerCase();
  
  // Complex reasoning tasks - high thinking budget
  if (
    content.includes('analyze') ||
    content.includes('explain') ||
    content.includes('reasoning') ||
    content.includes('logic') ||
    content.includes('problem') ||
    content.includes('solution') ||
    content.includes('compare') ||
    content.includes('evaluate') ||
    content.includes('pros and cons') ||
    content.includes('advantages') ||
    content.includes('disadvantages')
  ) {
    return { enabled: true, budget: 50000 }; // High thinking for complex reasoning
  }
  
  // Coding/technical tasks - medium thinking budget
  if (
    content.includes('code') ||
    content.includes('program') ||
    content.includes('function') ||
    content.includes('algorithm') ||
    content.includes('debug') ||
    content.includes('implement') ||
    content.includes('technical') ||
    content.includes('architecture') ||
    content.includes('design pattern')
  ) {
    return { enabled: true, budget: 30000 }; // Medium thinking for coding
  }
  
  // Math/calculation tasks - medium thinking budget
  if (
    content.includes('calculate') ||
    content.includes('math') ||
    content.includes('equation') ||
    content.includes('formula') ||
    content.includes('solve') ||
    content.includes('computation')
  ) {
    return { enabled: true, budget: 25000 }; // Medium thinking for math
  }
  
  // Creative tasks - low thinking budget
  if (
    content.includes('write') ||
    content.includes('story') ||
    content.includes('poem') ||
    content.includes('creative') ||
    content.includes('imagine') ||
    content.includes('describe')
  ) {
    return { enabled: true, budget: 10000 }; // Low thinking for creativity
  }
  
  // Simple questions - minimal thinking
  if (
    content.includes('what is') ||
    content.includes('who is') ||
    content.includes('when is') ||
    content.includes('where is') ||
    content.includes('define') ||
    content.includes('meaning')
  ) {
    return { enabled: true, budget: 5000 }; // Minimal thinking for simple questions
  }
  
  // Quick requests - no thinking for speed
  if (
    content.includes('quick') ||
    content.includes('fast') ||
    content.includes('brief') ||
    content.includes('summary') ||
    content.length < 50
  ) {
    return { enabled: false, budget: 0 }; // No thinking for speed
  }
  
  // Default: moderate thinking
  return { enabled: true, budget: 15000 };
};

