import { GoogleGenAI } from '@google/genai';
import type { Message, GroundingMetadata, UrlContextMetadata } from '../types/chat';
import { loadEnvConfig } from '../utils/env';
import { getNextBestModel, getModelSwitchExplanation } from '../config/gemini';

// Enhanced type definitions for Gemini service
export interface GeminiGenerationConfig {
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
  groundingConfig?: {
    enabled: boolean;
  };
  urlContextConfig?: {
    enabled: boolean;
  };
  systemInstruction?: string;
  thinkingConfig?: {
    enabled?: boolean;
    budget?: number;
  };
}

// Response type that can contain both text and images with RAI info
export interface GeminiResponse {
  text?: string;
  groundingMetadata?: GroundingMetadata;
  urlContextMetadata?: UrlContextMetadata;
}

export interface GeminiTool {
  googleSearch?: Record<string, unknown>;
  urlContext?: Record<string, unknown>;
}

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiRequestConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  tools?: GeminiTool[];
  systemInstruction?: string;
  thinkingConfig?: {
    thinkingBudget: number;
  };
}

// Simplified direct config pattern borrowed from examples
export interface DirectGeminiConfig {
  model: string;
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }>;
  config?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    tools?: GeminiTool[];
    systemInstruction?: string;
    thinkingConfig?: { thinkingBudget: number };
  };
}

export interface ModelCapabilities {
  supportsThinking: boolean;
  supportsGrounding: boolean;
  supportsUrlContext: boolean;
  maxContextTokens: number;
}


/**
 * Enhanced Gemini Service with comprehensive error handling and timeout management
 * Uses the latest Google GenAI SDK (v1.14.0) with proper error categorization
 * Supports multiple API keys with round-robin functionality
 * Updated for 2025 Gemini API features and best practices
 */
export class GeminiService {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  
  // Enhanced statistics and health tracking for 2025
  private keyHealth: Map<number, {
    successCount: number;
    errorCount: number;
    lastUsed: Date;
    lastError?: string;
    consecutiveErrors: number;
  }> = new Map();
  
  private totalRequests = 0;
  private totalErrors = 0;
  private startTime = Date.now();
  
  // Proxy functionality removed for security and simplicity
  
  // AbortController for stopping generation
  private currentAbortController?: AbortController;
  
  // Model switching tracking
  private modelSwitchHistory: Array<{
    fromModel: string;
    toModel: string;
    reason: string;
    timestamp: Date;
  }> = [];
  
  // Callback for notifying UI about model switches
  private onModelSwitchCallback?: (fromModel: string, toModel: string, reason: string) => void;

  constructor(apiKeys?: string[]) {
    if (apiKeys && apiKeys.length > 0) {
      this.setApiKeys(apiKeys);
    }
  }

  /**
   * Set multiple API keys for round-robin functionality
   * Enhanced with health tracking initialization
   * @param apiKeys - Array of Gemini API keys from Google AI Studio
   */
  setApiKeys(apiKeys: string[]): void {
    try {
      this.apiKeys = apiKeys.filter(key => key.trim() !== '');
      this.currentKeyIndex = 0;
      
      // Initialize health tracking for each key
      this.keyHealth.clear();
      this.apiKeys.forEach((_, index) => {
        this.keyHealth.set(index, {
          successCount: 0,
          errorCount: 0,
          lastUsed: new Date(0),
          consecutiveErrors: 0
        });
      });
      
      console.log(`✅ Gemini API client initialized with ${this.apiKeys.length} API keys`);
      console.log(`📊 Health tracking enabled for all keys`);
    } catch (error) {
      console.error('❌ Failed to initialize Gemini API client:', error);
      throw new Error(`Failed to initialize Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set callback for model switch notifications
   * @param callback - Function to call when model switches occur
   */
  setModelSwitchCallback(callback: (fromModel: string, toModel: string, reason: string) => void): void {
    this.onModelSwitchCallback = callback;
  }

  /**
   * Get model switch history
   * @returns Array of model switch events
   */
  getModelSwitchHistory(): Array<{
    fromModel: string;
    toModel: string;
    reason: string;
    timestamp: Date;
  }> {
    return [...this.modelSwitchHistory];
  }

  /**
   * Record a model switch event
   * @private
   */
  private recordModelSwitch(fromModel: string, toModel: string, reason: string): void {
    const switchEvent = {
      fromModel,
      toModel,
      reason,
      timestamp: new Date(),
    };
    
    this.modelSwitchHistory.push(switchEvent);
    
    // Keep only last 50 switch events
    if (this.modelSwitchHistory.length > 50) {
      this.modelSwitchHistory.shift();
    }
    
    // Notify UI if callback is set
    if (this.onModelSwitchCallback) {
      this.onModelSwitchCallback(fromModel, toModel, reason);
    }
    
    console.log(`🔄 Model switched: ${fromModel} → ${toModel} (${reason})`);
  }

  /**
   * Analyze and categorize API errors with user-friendly explanations
   * @private
   */
  private categorizeApiError(error: any): { 
    category: string; 
    explanation: string; 
    suggestion: string; 
    isQuotaExhausted?: boolean;
    allowModelSwitch?: boolean;
  } {
    const errorMessage = error?.message || '';
    const errorCode = error?.status || error?.code;

    // Quota exhausted
    if (errorCode === 429 || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return {
        category: 'QUOTA_EXCEEDED',
        explanation: 'API quota limit reached. You have exceeded the daily free tier limit (100 requests per day).',
        suggestion: 'Wait 24 hours for quota reset or upgrade to a paid plan at https://makersuite.google.com/',
        isQuotaExhausted: true,
        allowModelSwitch: true,
      };
    }

    // API key expired or invalid
    if (errorCode === 400 && (errorMessage.includes('API key expired') || errorMessage.includes('API_KEY_INVALID'))) {
      return {
        category: 'API_KEY_EXPIRED',
        explanation: 'Your API key has expired and needs to be renewed.',
        suggestion: 'Generate a new API key at https://makersuite.google.com/app/apikey',
        allowModelSwitch: false,
      };
    }

    // API not enabled
    if (errorCode === 403 && errorMessage.includes('SERVICE_DISABLED')) {
      return {
        category: 'API_NOT_ENABLED',
        explanation: 'The Generative Language API is not enabled for your Google Cloud project.',
        suggestion: 'Enable the API in the Google Cloud Console at the URL provided in the error message',
        allowModelSwitch: false,
      };
    }

    // Thinking mode budget issue
    if (errorCode === 400 && errorMessage.includes('Budget 0 is invalid')) {
      return {
        category: 'THINKING_MODE_REQUIRED',
        explanation: 'The gemini-2.5-pro model requires thinking mode to be enabled with a budget > 0.',
        suggestion: 'This has been automatically fixed. Please try again.',
        allowModelSwitch: true,
      };
    }

    // Authentication/Permission issues
    if (errorCode === 401 || errorCode === 403) {
      return {
        category: 'AUTHENTICATION_ERROR',
        explanation: 'Authentication failed. Your API key may be invalid or lacking permissions.',
        suggestion: 'Check your API key and ensure it has the necessary permissions',
        allowModelSwitch: false,
      };
    }

    // Network/Timeout issues
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return {
        category: 'NETWORK_ERROR',
        explanation: 'Network connectivity issue or request timeout.',
        suggestion: 'Check your internet connection',
        allowModelSwitch: false,
      };
    }

    // Default fallback
    return {
      category: 'UNKNOWN_ERROR',
      explanation: `Unexpected error: ${errorMessage}`,
      suggestion: 'Please check the error details and try again',
      allowModelSwitch: true, // Allow model switch for unknown errors
    };
  }

  /**
   * Get the current API key
   * @private
   */
  private getCurrentApiKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys available. Please set API keys first.');
    }
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Move to the next API key in round-robin fashion
   * @private
   */
  private moveToNextKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`🔄 Switched to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
  }

  /**
   * Create a new GoogleGenAI instance with the current API key
   * @private
   */
  private createGenAI(): GoogleGenAI {
    const apiKey = this.getCurrentApiKey();
    
    // Determine the appropriate base URL based on environment
    let baseUrl: string;
    
    // Check for custom proxy URL in environment
    const customProxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL || process.env.VITE_GEMINI_PROXY_URL;
    
    if (customProxyUrl) {
      // Use custom proxy URL (for production deployments)
      baseUrl = customProxyUrl;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Use Vite dev proxy for local development
      baseUrl = `${window.location.origin}/api/gemini`;
    } else {
      // For production without proxy, use Cloudflare Worker path
      baseUrl = `${window.location.origin}/api/gemini`;
    }
    
    console.log(`🌐 Using Gemini API proxy: ${baseUrl}`);
    
    return new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        baseUrl
      }
    });
  }

  /**
   * Stop current generation process
   */
  stopGeneration(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = undefined;
      console.log('🛑 Generation stopped by user');
    }
  }

  /**
   * Generate streaming response with intelligent model switching
   * Automatically switches to alternative models when quota is exhausted
   * @param messages - Array of conversation messages
   * @param preferredModel - Preferred model to start with
   * @param config - Optional conversation configuration
   * @returns AsyncGenerator yielding chunks with model switch notifications
   */
  async* generateStreamingResponseWithModelSwitch(
    messages: Message[],
    preferredModel: string = 'gemini-2.0-flash',
    config?: GeminiGenerationConfig
  ): AsyncGenerator<{ 
    text?: string; 
    groundingMetadata?: GroundingMetadata; 
    urlContextMetadata?: UrlContextMetadata;
    modelSwitched?: boolean;
    newModel?: string;
    switchReason?: string;
  }, void, unknown> {
    
    // Validate prerequisites
    if (this.apiKeys.length === 0) {
      const error = new Error('No API keys available. Please set API keys first.');
      console.error('❌ API Key Error:', error.message);
      throw error;
    }

    if (!messages || messages.length === 0) {
      const error = new Error('No messages provided for generation');
      console.error('❌ Input Validation Error:', error.message);
      throw error;
    }

    console.log(`🚀 Starting intelligent streaming with preferred model: ${preferredModel}`);
    console.log(`📝 Processing ${messages.length} messages`);

    let currentModel = preferredModel;
    let hasTriedAlternatives = false;

    // Try preferred model first, then alternatives if needed
    while (true) {
      try {
        console.log(`🔄 Attempting streaming with model: ${currentModel}`);
        
        // Use grounding-enabled streaming if available and enabled
        const useGrounding = config?.groundingConfig?.enabled;
        
        if (useGrounding) {
          yield* this.executeStreamingWithModel(
            messages, 
            currentModel, 
            config, 
            true // use grounding
          );
        } else {
          yield* this.executeStreamingWithModel(
            messages, 
            currentModel, 
            config, 
            false // no grounding
          );
        }
        
        // Success - exit the loop
        console.log(`✅ Streaming successful with model: ${currentModel}`);
        return;
        
      } catch (error) {
        const errorAnalysis = this.categorizeApiError(error as Error);
        
        console.error(`❌ Model ${currentModel} failed:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          category: errorAnalysis.category,
          allowModelSwitch: errorAnalysis.allowModelSwitch
        });

        // If error allows model switching and we haven't tried alternatives yet
        if (errorAnalysis.allowModelSwitch && errorAnalysis.isQuotaExhausted && !hasTriedAlternatives) {
          const nextModel = getNextBestModel(currentModel);
          
          if (nextModel) {
            const switchReason = getModelSwitchExplanation(currentModel, nextModel);
            this.recordModelSwitch(currentModel, nextModel, `Quota exhausted: ${switchReason}`);
            
            // Notify UI about model switch
            yield {
              modelSwitched: true,
              newModel: nextModel,
              switchReason: `⚠️ ${currentModel} quota exhausted. ${switchReason}`
            };
            
            currentModel = nextModel;
            hasTriedAlternatives = true;
            
            // Reset the error state and try again with the new model
            console.log(`🔄 Retrying with new model: ${currentModel}`);
            continue; // Try again with new model
          } else {
            // No alternative model available
            console.log(`💥 No alternative model available for ${currentModel}`);
            throw new Error(`Quota exhausted for model ${currentModel} and no suitable alternatives available. Please wait for quota reset or upgrade your plan.`);
          }
        }
        
        // If we can't switch models or have no alternatives, give up
        console.error(`💥 All model options exhausted for streaming`);
        throw error;
      }
    }
  }

  /**
   * Execute streaming generation with a specific model
   * @private
   */
  private async* executeStreamingWithModel(
    messages: Message[],
    model: string,
    config?: GeminiGenerationConfig,
    useGrounding: boolean = false
  ): AsyncGenerator<{ 
    text?: string; 
    groundingMetadata?: GroundingMetadata; 
    urlContextMetadata?: UrlContextMetadata;
  }, void, unknown> {
    
    this.totalRequests++;
    
    if (useGrounding) {
      yield* this.executeGroundingStreamingGeneration(messages, model, config);
    } else {
      // Adapt the string-based generator to object-based generator
      const stringGenerator = this.executeStreamingGeneration(messages, model, config);
      for await (const textChunk of stringGenerator) {
        yield { text: textChunk };
      }
    }
    
    // Track success for the current key
    this.trackKeySuccess(this.currentKeyIndex);
  }

  /**
   * Generate streaming response with Google Search Grounding support
   * Enhanced for 2025 with grounding and URL context capabilities
   * @param messages - Array of conversation messages
   * @param model - Model to use (defaults to gemini-2.0-flash)
   * @param config - Optional conversation configuration
   * @returns AsyncGenerator yielding chunks and final grounding metadata
   */
  async* generateStreamingResponseWithGrounding(
    messages: Message[],
    model: string = 'gemini-2.0-flash',
    config?: GeminiGenerationConfig
  ): AsyncGenerator<{ text?: string; groundingMetadata?: GroundingMetadata; urlContextMetadata?: UrlContextMetadata }, void, unknown> {
    // Validate prerequisites
    if (this.apiKeys.length === 0) {
      const error = new Error('No API keys available. Please set API keys first.');
      console.error('❌ API Key Error:', error.message);
      throw error;
    }

    if (!messages || messages.length === 0) {
      const error = new Error('No messages provided for generation');
      console.error('❌ Input Validation Error:', error.message);
      throw error;
    }

    console.log(`🚀 Starting grounding-enabled streaming with model: ${model}`);
    console.log(`📝 Processing ${messages.length} messages`);
    console.log(`🔍 Grounding enabled: ${config?.groundingConfig?.enabled || false}`);
    console.log(`🌐 URL Context enabled: ${config?.urlContextConfig?.enabled || false}`);

    // Create abort controller for this generation
    this.currentAbortController = new AbortController();

    let lastError: Error | null = null;
    const initialKeyIndex = this.currentKeyIndex;

    // Try each API key until one succeeds
    do {
      try {
        console.log(`🔄 Attempting grounding streaming with API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
        this.totalRequests++;
        
        yield* this.executeGroundingStreamingGeneration(messages, model, config);
        
        // Track success
        this.trackKeySuccess(this.currentKeyIndex);
        console.log('✅ Grounding streaming generation successful');
        this.currentAbortController = undefined;
        return;
      } catch (error) {
        // Check if this is an abort error
        if ((error as Error).name === 'AbortError') {
          console.log('🛑 Grounding streaming generation aborted by user');
          this.currentAbortController = undefined;
          return;
        }

        lastError = error as Error;
        this.totalErrors++;
        
        // Track error for current key
        this.trackKeyError(this.currentKeyIndex, (error as Error).message);
        
        console.error(`❌ Grounding API key ${this.currentKeyIndex + 1} failed:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        });

        // Move to next key
        this.moveToNextKey();

        // If we've tried all keys, break
        if (this.currentKeyIndex === initialKeyIndex) {
          console.log('💥 All API keys failed for grounding streaming');
          break;
        }
      }
    } while (this.currentKeyIndex !== initialKeyIndex);

    // All API keys exhausted
    console.error('💥 All API keys failed for grounding streaming');
    throw lastError || new Error('Failed to generate grounding streaming response with any API key');
  }
  async* generateStreamingResponse(
    messages: Message[],
    model: string = 'gemini-2.0-flash',
    config?: GeminiGenerationConfig
  ): AsyncGenerator<string, void, unknown> {
    // Validate prerequisites
    if (this.apiKeys.length === 0) {
      const error = new Error('No API keys available. Please set API keys first.');
      console.error('❌ API Key Error:', error.message);
      throw error;
    }

    if (!messages || messages.length === 0) {
      const error = new Error('No messages provided for generation');
      console.error('❌ Input Validation Error:', error.message);
      throw error;
    }

    console.log(`🚀 Starting streaming content generation with model: ${model}`);
    console.log(`📝 Processing ${messages.length} messages`);
    console.log(`🔑 Using ${this.apiKeys.length} API keys in round-robin mode`);

    // Create abort controller for this generation
    this.currentAbortController = new AbortController();

    let lastError: Error | null = null;
    const initialKeyIndex = this.currentKeyIndex;

    // Try each API key until one succeeds
    do {
      try {
        console.log(`🔄 Attempting streaming with API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
        this.totalRequests++;
        
        yield* this.executeStreamingGeneration(messages, model, config);
        
        // Track success
        this.trackKeySuccess(this.currentKeyIndex);
        console.log('✅ Streaming content generation successful');
        this.currentAbortController = undefined;
        return;
      } catch (error) {
        // Check if this is an abort error
        if ((error as Error).name === 'AbortError') {
          console.log('🛑 Streaming generation aborted by user');
          this.currentAbortController = undefined;
          return;
        }

        lastError = error as Error;
        this.totalErrors++;
        
        // Track error for current key
        this.trackKeyError(this.currentKeyIndex, (error as Error).message);
        
        console.error(`❌ Streaming API key ${this.currentKeyIndex + 1} failed:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        });

        // Check if this is a non-retryable error for this specific key
        if (this.isNonRetryableError(error as Error)) {
          console.log('🚫 Non-retryable error detected, trying next API key');
        }

        // Move to next key
        this.moveToNextKey();

        // If we've tried all keys, break
        if (this.currentKeyIndex === initialKeyIndex) {
          console.log('💥 All API keys failed for streaming');
          break;
        }
      }
    } while (this.currentKeyIndex !== initialKeyIndex);

    // All API keys exhausted
    console.error('💥 All API keys failed for streaming');
    throw lastError || new Error('Failed to generate streaming response with any API key');
  }

  /**
   * Execute grounding streaming generation with tools support
   * @private
   */
  private async* executeGroundingStreamingGeneration(
    messages: Message[], 
    model: string,
    config?: GeminiGenerationConfig
  ): AsyncGenerator<{ text?: string; groundingMetadata?: GroundingMetadata; urlContextMetadata?: UrlContextMetadata }, void, unknown> {
    const ai = this.createGenAI();
    const lastMessage = messages[messages.length - 1];

    try {
      if (lastMessage.files && lastMessage.files.length > 0) {
        console.log(`📎 Processing ${lastMessage.files.length} file attachments for grounding streaming`);
        yield* this.handleGroundingStreamingMultimodalGeneration(ai, lastMessage, model, config);
      } else {
        console.log('💬 Processing text-only grounding streaming conversation');
        yield* this.handleGroundingStreamingTextGeneration(ai, messages, model, config);
      }
    } catch (error) {
      this.categorizeAndLogError(error as Error);
      throw error;
    }
  }

  /**
   * Handle grounding streaming text generation with tools
   * @private
   */
  private async* handleGroundingStreamingTextGeneration(
    ai: GoogleGenAI,
    messages: Message[],
    model: string,
    config?: GeminiGenerationConfig
  ): AsyncGenerator<{ text?: string; groundingMetadata?: GroundingMetadata; urlContextMetadata?: UrlContextMetadata }, void, unknown> {
    const lastMessage = messages[messages.length - 1];
    
    // Build tools array based on configuration
    const tools: GeminiTool[] = [];
    
    if (config?.groundingConfig?.enabled) {
      console.log('🔍 Adding Google Search grounding tool');
      tools.push({ googleSearch: {} });
    }
    
    if (config?.urlContextConfig?.enabled) {
      console.log('🌐 Adding URL Context tool');
      tools.push({ urlContext: {} });
    }

    // Merge config with defaults and include tools
    const generationConfig = {
      temperature: config?.generationConfig?.temperature ?? 0.7,
      topK: config?.generationConfig?.topK ?? 40,
      topP: config?.generationConfig?.topP ?? 0.95,
      maxOutputTokens: config?.generationConfig?.maxOutputTokens ?? 1000000,
    };

    const requestConfig: GeminiRequestConfig = {
      ...generationConfig,
      ...(tools.length > 0 && { tools }),
      ...(config?.systemInstruction && {
        systemInstruction: config.systemInstruction
      }),
      ...(model.includes('2.5') && {
        thinkingConfig: {
          thinkingBudget: model.includes('2.5-pro') ? (config?.thinkingConfig?.budget ?? 10000) : (config?.thinkingConfig?.enabled === false ? 0 : (config?.thinkingConfig?.budget ?? 10000)),
        }
      }),
    };
    
    if (messages.length === 1) {
      // Single message with tools
      console.log('📝 Single message grounding streaming generation');
      
      const response = await ai.models.generateContentStream({
        model,
        contents: [{ role: 'user', parts: [{ text: lastMessage.content }] }],
        config: requestConfig
      });

      let accumulatedText = '';
      for await (const chunk of response) {
        // Check if generation was aborted
        if (this.currentAbortController?.signal.aborted) {
          break;
        }
        
        if (chunk.text) {
          accumulatedText += chunk.text;
          yield { text: chunk.text };
        }
      }

      // Extract grounding metadata from final response
      if (response.candidates?.[0]?.groundingMetadata) {
        yield { 
          groundingMetadata: response.candidates[0].groundingMetadata as GroundingMetadata 
        };
      }

      if (response.candidates?.[0]?.urlContextMetadata) {
        yield { 
          urlContextMetadata: response.candidates[0].urlContextMetadata as UrlContextMetadata 
        };
      }
    } else {
      // Multi-turn conversation with tools
      const history = messages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: msg.content || '' }],
      })).filter(msg => msg.parts[0].text.trim() !== '');

      console.log(`📚 Chat history with grounding: ${history.length} messages`);
      
      const chat = ai.chats.create({
        model,
        history,
        config: requestConfig
      });

      if (!lastMessage.content || lastMessage.content.trim() === '') {
        throw new Error('Message content cannot be empty');
      }
      
      const response = await chat.sendMessageStream({
        message: lastMessage.content.trim()
      });
      
      let accumulatedText = '';
      for await (const chunk of response) {
        // Check if generation was aborted
        if (this.currentAbortController?.signal.aborted) {
          break;
        }
        
        if (chunk.text) {
          accumulatedText += chunk.text;
          yield { text: chunk.text };
        }
      }

      // Extract grounding metadata from final response
      if (response.candidates?.[0]?.groundingMetadata) {
        yield { 
          groundingMetadata: response.candidates[0].groundingMetadata as GroundingMetadata 
        };
      }

      if (response.candidates?.[0]?.urlContextMetadata) {
        yield { 
          urlContextMetadata: response.candidates[0].urlContextMetadata as UrlContextMetadata 
        };
      }
    }
  }

  /**
   * Handle grounding streaming multimodal generation
   * @private
   */
  private async* handleGroundingStreamingMultimodalGeneration(
    ai: GoogleGenAI,
    message: Message,
    model: string,
    config?: GeminiGenerationConfig
  ): AsyncGenerator<{ text?: string; groundingMetadata?: GroundingMetadata; urlContextMetadata?: UrlContextMetadata }, void, unknown> {
    const parts: GeminiContentPart[] = [{ text: message.content }];
    
    // Process files (same logic as before)
    for (const file of message.files!) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf') {
        console.log(`📎 Processing ${file.type} for grounding: ${file.name}`);
        
        if (!file.data) {
          throw new Error(`File data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      }
    }

    // Build tools array
    const tools: GeminiTool[] = [];
    
    if (config?.groundingConfig?.enabled) {
      console.log('🔍 Adding Google Search grounding tool for multimodal');
      tools.push({ googleSearch: {} });
    }
    
    if (config?.urlContextConfig?.enabled) {
      console.log('🌐 Adding URL Context tool for multimodal');
      tools.push({ urlContext: {} });
    }

    console.log(`🔧 Generating grounding multimodal content with ${parts.length} parts and ${tools.length} tools`);
    
    const generationConfig = {
      temperature: config?.generationConfig?.temperature ?? 0.7,
      topK: config?.generationConfig?.topK ?? 40,
      topP: config?.generationConfig?.topP ?? 0.95,
      maxOutputTokens: config?.generationConfig?.maxOutputTokens ?? 2000000,
      responseMimeType: config?.generationConfig?.responseMimeType ?? "text/plain",
    };

    const requestConfig: GeminiRequestConfig = {
      ...generationConfig,
      ...(tools.length > 0 && { tools }),
      ...(config?.systemInstruction && {
        systemInstruction: config.systemInstruction
      }),
      ...(model.includes('2.5') && {
        thinkingConfig: {
          thinkingBudget: model.includes('2.5-pro') ? (config?.thinkingConfig?.budget ?? 10000) : (config?.thinkingConfig?.enabled === false ? 0 : (config?.thinkingConfig?.budget ?? 10000)),
        }
      }),
    };
    
    const response = await ai.models.generateContentStream({
      model,
      contents: [{ role: 'user', parts }],
      config: requestConfig
    });

    let accumulatedText = '';
    for await (const chunk of response) {
      // Check if generation was aborted
      if (this.currentAbortController?.signal.aborted) {
        break;
      }
      
      if (chunk.text) {
        accumulatedText += chunk.text;
        yield { text: chunk.text };
      }
    }

    // Extract grounding metadata from final response
    if (response.candidates?.[0]?.groundingMetadata) {
      yield { 
        groundingMetadata: response.candidates[0].groundingMetadata as GroundingMetadata 
      };
    }

    if (response.candidates?.[0]?.urlContextMetadata) {
      yield { 
        urlContextMetadata: response.candidates[0].urlContextMetadata as UrlContextMetadata 
      };
    }
  }
  private async* executeStreamingGeneration(
    messages: Message[], 
    model: string,
    config?: GeminiGenerationConfig
  ): AsyncGenerator<string, void, unknown> {
    const ai = this.createGenAI();
    const lastMessage = messages[messages.length - 1];

    try {
      if (lastMessage.files && lastMessage.files.length > 0) {
        console.log(`📎 Processing ${lastMessage.files.length} file attachments for streaming`);
        yield* this.handleStreamingMultimodalGeneration(ai, lastMessage, model, config);
      } else {
        console.log('💬 Processing text-only streaming conversation');
        yield* this.handleStreamingTextGeneration(ai, messages, model, config);
      }
    } catch (error) {
      this.categorizeAndLogError(error as Error);
      throw error;
    }
  }

  /**
   * Handle streaming multimodal generation (text + files)
   * @private
   */
  private async* handleStreamingMultimodalGeneration(
    ai: GoogleGenAI,
    message: Message,
    model: string,
    config?: GeminiGenerationConfig
  ): AsyncGenerator<string, void, unknown> {
    
    const parts: GeminiContentPart[] = [{ text: message.content }];
    
    for (const file of message.files!) {
      if (file.type.startsWith('image/')) {
        console.log(`🖼️ Processing image for streaming: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`Image data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      } else if (file.type.startsWith('video/')) {
        console.log(`🎥 Processing video for streaming: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`Video data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      } else if (file.type === 'application/pdf') {
        console.log(`📄 Processing PDF for streaming: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`PDF data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      } else if (file.type === 'text/plain' || 
                 file.name.endsWith('.txt') ||
                 file.name.endsWith('.js') ||
                 file.name.endsWith('.ts') ||
                 file.name.endsWith('.jsx') ||
                 file.name.endsWith('.tsx') ||
                 file.name.endsWith('.py') ||
                 file.name.endsWith('.java') ||
                 file.name.endsWith('.cpp') ||
                 file.name.endsWith('.c') ||
                 file.name.endsWith('.h') ||
                 file.name.endsWith('.css') ||
                 file.name.endsWith('.html') ||
                 file.name.endsWith('.xml') ||
                 file.name.endsWith('.json') ||
                 file.name.endsWith('.md') ||
                 file.name.endsWith('.yaml') ||
                 file.name.endsWith('.yml') ||
                 file.name.endsWith('.sql') ||
                 file.name.endsWith('.sh') ||
                 file.name.endsWith('.php') ||
                 file.name.endsWith('.rb') ||
                 file.name.endsWith('.go') ||
                 file.name.endsWith('.rs') ||
                 file.name.endsWith('.swift') ||
                 file.name.endsWith('.kt') ||
                 file.name.endsWith('.scala')) {
        console.log(`📄 Processing text/code file for streaming: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`Text file data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: 'text/plain',
            data: base64Data,
          },
        });
      }
    }

    console.log(`🔧 Generating streaming content with ${parts.length} parts`);
    
    // Merge config with defaults
    const generationConfig = {
      temperature: config?.generationConfig?.temperature ?? 0.7,
      topK: config?.generationConfig?.topK ?? 40,
      topP: config?.generationConfig?.topP ?? 0.95,
      maxOutputTokens: config?.generationConfig?.maxOutputTokens ?? 2000000,
      responseMimeType: config?.generationConfig?.responseMimeType ?? "text/plain",
    };

    const requestConfig: GeminiRequestConfig = {
      ...generationConfig,
      // System instruction
      ...(config?.systemInstruction && {
        systemInstruction: config.systemInstruction
      }),
      // Thinking configuration for 2.5 models
      ...(model.includes('2.5') && {
        thinkingConfig: {
          thinkingBudget: model.includes('2.5-pro') ? (config?.thinkingConfig?.budget ?? 10000) : (config?.thinkingConfig?.enabled === false ? 0 : (config?.thinkingConfig?.budget ?? 10000)),
        }
      }),
    };
    
    const response = await ai.models.generateContentStream({
      model,
      contents: [{ role: 'user', parts }],
      config: requestConfig
    });

    for await (const chunk of response) {
      // Check if generation was aborted
      if (this.currentAbortController?.signal.aborted) {
        break;
      }
      
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  /**
   * Handle streaming text-only generation with simplified chat history (pattern from examples)
   * @private
   */
  private async* handleStreamingTextGeneration(
    ai: GoogleGenAI,
    messages: Message[],
    model: string,
    config?: GeminiGenerationConfig
  ): AsyncGenerator<string, void, unknown> {
    const lastMessage = messages[messages.length - 1];
    
    
    // Simplified config pattern from examples
    const requestConfig = {
      temperature: config?.generationConfig?.temperature ?? 0.7,
      topK: config?.generationConfig?.topK ?? 40,
      topP: config?.generationConfig?.topP ?? 0.95,
      maxOutputTokens: config?.generationConfig?.maxOutputTokens ?? 1000000,
      ...(config?.systemInstruction && { systemInstruction: config.systemInstruction }),
      ...(model.includes('2.5') && {
        thinkingConfig: {
          thinkingBudget: model.includes('2.5-pro') ? (config?.thinkingConfig?.budget ?? 10000) : (config?.thinkingConfig?.enabled === false ? 0 : (config?.thinkingConfig?.budget ?? 10000)),
        }
      }),
    };
    
    if (messages.length === 1) {
      // Single message - direct generation pattern from examples
      console.log('📝 Single message streaming generation');
      
      const response = await ai.models.generateContentStream({
        model,
        contents: [{ role: 'user', parts: [{ text: lastMessage.content }] }],
        config: requestConfig
      });

      for await (const chunk of response) {
        if (this.currentAbortController?.signal.aborted) break;
        if (chunk.text) yield chunk.text;
      }
    } else {
      // Multi-turn conversation using SDK built-in chat pattern (from examples)
      const history = messages.slice(0, -1)
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: msg.content || '' }]
        }))
        .filter(msg => msg.parts[0].text.trim() !== '');

      console.log(`📚 Chat with ${history.length} history messages (SDK pattern)`);
      
      // Use SDK's built-in chat creation pattern from examples
      const chat = ai.chats.create({ model, history, config: requestConfig });

      if (!lastMessage.content?.trim()) {
        throw new Error('Message content cannot be empty');
      }
      
      // Simplified message sending pattern from examples
      const response = await chat.sendMessageStream({ message: lastMessage.content.trim() });
      
      for await (const chunk of response) {
        if (this.currentAbortController?.signal.aborted) break;
        if (chunk.text) yield chunk.text;
      }
    }
  }

  /**
   * Generate response with intelligent model switching
   * Automatically switches to alternative models when quota is exhausted
   * @param messages - Array of conversation messages
   * @param preferredModel - Preferred model to start with
   * @param config - Optional conversation configuration
   * @returns Promise with response and model switch information
   */
  async generateResponseWithModelSwitch(
    messages: Message[],
    preferredModel: string = 'gemini-2.0-flash',
    config?: GeminiGenerationConfig
  ): Promise<{
    response: string | GeminiResponse;
    modelUsed: string;
    modelSwitched?: boolean;
    switchReason?: string;
  }> {
    
    // Validate prerequisites
    if (this.apiKeys.length === 0) {
      const error = new Error('No API keys available. Please set API keys first.');
      console.error('❌ API Key Error:', error.message);
      throw error;
    }

    if (!messages || messages.length === 0) {
      const error = new Error('No messages provided for generation');
      console.error('❌ Input Validation Error:', error.message);
      throw error;
    }

    console.log(`🚀 Starting intelligent generation with preferred model: ${preferredModel}`);
    console.log(`📝 Processing ${messages.length} messages`);

    let currentModel = preferredModel;
    let hasTriedAlternatives = false;

    // Try preferred model first, then alternatives if needed
    while (true) {
      try {
        console.log(`🔄 Attempting generation with model: ${currentModel}`);
        this.totalRequests++;
        
        const response = await this.executeGenerationWithRetries(messages, currentModel, config);
        
        // Track success
        this.trackKeySuccess(this.currentKeyIndex);
        
        console.log(`✅ Generation successful with model: ${currentModel}`);
        return {
          response,
          modelUsed: currentModel,
          modelSwitched: currentModel !== preferredModel,
          switchReason: currentModel !== preferredModel ? `Switched from ${preferredModel} due to quota limits` : undefined
        };
        
      } catch (error) {
        const errorAnalysis = this.categorizeApiError(error as Error);
        
        console.error(`❌ Model ${currentModel} failed:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          category: errorAnalysis.category,
          isQuotaExhausted: errorAnalysis.isQuotaExhausted
        });

        // Only try model switching for quota exhaustion errors
        if (errorAnalysis.isQuotaExhausted && !hasTriedAlternatives) {
          const nextModel = getNextBestModel(currentModel);
          
          if (nextModel) {
            const switchReason = getModelSwitchExplanation(currentModel, nextModel);
            this.recordModelSwitch(currentModel, nextModel, `Quota exhausted: ${switchReason}`);
            
            currentModel = nextModel;
            hasTriedAlternatives = true;
            continue; // Try again with new model
          } else {
            // No alternative model available
            console.log(`💥 No alternative model available for ${currentModel}`);
            throw new Error(`Quota exhausted for model ${currentModel} and no suitable alternatives available. Please wait for quota reset or upgrade your plan.`);
          }
        }
        
        // For non-quota errors or if we've already tried alternatives, give up
        console.error(`💥 All model options exhausted for generation`);
        throw error;
      }
    }
  }

  /**
   * Generate response from Gemini AI with comprehensive error handling and multiple API key support
   * @deprecated Use generateResponseWithModelSwitch for intelligent model switching
   * @param messages - Array of conversation messages
   * @param model - Model to use (defaults to gemini-2.0-flash)
   * @returns Promise<string> - The AI response
   */
  async generateResponse(
    messages: Message[],
    model: string = 'gemini-2.0-flash',
    config?: GeminiGenerationConfig
  ): Promise<string | GeminiResponse> {
    // For backward compatibility, just use the model switch version but only return the response
    const result = await this.generateResponseWithModelSwitch(messages, model, config);
    return result.response;
  }

  /**
   * Execute generation with retries for a single API key
   * @private
   */
  private async executeGenerationWithRetries(messages: Message[], model: string, config?: GeminiGenerationConfig): Promise<string | GeminiResponse> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.MAX_RETRIES) {
      attempt++;
      console.log(`🔄 Retry attempt ${attempt}/${this.MAX_RETRIES} for current API key`);

      try {
        const result = await this.executeGeneration(messages, model, config);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Retry attempt ${attempt} failed:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        });

        // Don't retry for certain error types
        if (this.isNonRetryableError(error as Error)) {
          console.log('🚫 Non-retryable error detected, stopping retries for this key');
          break;
        }

        // Wait before retry with enhanced adaptive delay
        if (attempt < this.MAX_RETRIES) {
          const delay = this.getRetryDelay(attempt, error as Error);
          console.log(`⏳ Waiting ${delay}ms before retry (attempt ${attempt}/${this.MAX_RETRIES})...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Failed to generate response after multiple attempts with current API key');
  }

  /**
   * Execute the actual content generation with timeout handling
   * Updated for new @google/genai SDK architecture
   * @private
   */
  private async executeGeneration(messages: Message[], model: string, config?: GeminiGenerationConfig): Promise<string | GeminiResponse> {
    const ai = this.createGenAI();
    const lastMessage = messages[messages.length - 1];
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.DEFAULT_TIMEOUT}ms`));
      }, this.DEFAULT_TIMEOUT);
    });

    try {
      if (lastMessage.files && lastMessage.files.length > 0) {
        console.log(`📎 Processing ${lastMessage.files.length} file attachments`);
        return await Promise.race([
          this.handleMultimodalGeneration(ai, lastMessage, model, config),
          timeoutPromise
        ]);
      } else {
        console.log('💬 Processing text-only conversation');
        return await Promise.race([
          this.handleTextGeneration(ai, messages, model, config),
          timeoutPromise
        ]);
      }
    } catch (error) {
      this.categorizeAndLogError(error as Error);
      throw error;
    }
  }

  /**
   * Handle multimodal generation (text + files)
   * Updated for new @google/genai SDK
   * @private
   */
  private async handleMultimodalGeneration(
    ai: GoogleGenAI, 
    message: Message,
    model: string,
    config?: GeminiGenerationConfig
  ): Promise<string | GeminiResponse> {
    
    const parts: GeminiContentPart[] = [{ text: message.content }];
    
    for (const file of message.files!) {
      if (file.type.startsWith('image/')) {
        console.log(`🖼️ Processing image: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`Image data missing for file: ${file.name}`);
        }

        // Remove data URL prefix if present
        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      } else if (file.type.startsWith('video/')) {
        console.log(`🎥 Processing video: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`Video data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      } else if (file.type === 'application/pdf') {
        console.log(`📄 Processing PDF: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`PDF data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
      } else if (file.type === 'text/plain' || 
                 file.name.endsWith('.txt') ||
                 file.name.endsWith('.js') ||
                 file.name.endsWith('.ts') ||
                 file.name.endsWith('.jsx') ||
                 file.name.endsWith('.tsx') ||
                 file.name.endsWith('.py') ||
                 file.name.endsWith('.java') ||
                 file.name.endsWith('.cpp') ||
                 file.name.endsWith('.c') ||
                 file.name.endsWith('.h') ||
                 file.name.endsWith('.css') ||
                 file.name.endsWith('.html') ||
                 file.name.endsWith('.xml') ||
                 file.name.endsWith('.json') ||
                 file.name.endsWith('.md') ||
                 file.name.endsWith('.yaml') ||
                 file.name.endsWith('.yml') ||
                 file.name.endsWith('.sql') ||
                 file.name.endsWith('.sh') ||
                 file.name.endsWith('.php') ||
                 file.name.endsWith('.rb') ||
                 file.name.endsWith('.go') ||
                 file.name.endsWith('.rs') ||
                 file.name.endsWith('.swift') ||
                 file.name.endsWith('.kt') ||
                 file.name.endsWith('.scala')) {
        console.log(`📄 Processing text/code file: ${file.name} (${file.type})`);
        
        if (!file.data) {
          throw new Error(`Text file data missing for file: ${file.name}`);
        }

        const base64Data = file.data.includes(',') 
          ? file.data.split(',')[1] 
          : file.data;

        parts.push({
          inlineData: {
            mimeType: 'text/plain',
            data: base64Data,
          },
        });
      } else {
        console.log(`📄 Skipping unsupported file: ${file.name} (${file.type})`);
      }
    }

    console.log(`🔧 Generating content with ${parts.length} parts`);
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000000,
        // New 2.5 model thinking configuration
        ...(model.includes('2.5') && {
          thinkingConfig: {
            thinkingBudget: 10000, // Default thinking enabled, configurable
          }
        }),
        // System instruction support
        systemInstruction: "You are a helpful assistant. Please provide accurate and detailed responses.",
      }
    });
    
    if (!response.text) {
      throw new Error('Empty response received from Gemini API');
    }

    return response.text;
  }

  /**
   * Handle text-only generation with simplified chat history pattern (from examples)
   * @private
   */
  private async handleTextGeneration(
    ai: GoogleGenAI, 
    messages: Message[],
    model: string,
    config?: GeminiGenerationConfig
  ): Promise<string | GeminiResponse> {
    
    const lastMessage = messages[messages.length - 1];
    
    // Simplified configuration pattern from examples
    const requestConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1000000,
      ...(model.includes('2.5') && {
        thinkingConfig: { thinkingBudget: 10000 }
      }),
      systemInstruction: "You are a helpful assistant. Please provide accurate and detailed responses.",
    };
    
    if (messages.length === 1) {
      // Single message generation (pattern from examples)
      console.log('📝 Single message generation');
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: lastMessage.content }] }],
        config: requestConfig
      });
      return response.text;
    } else {
      // Multi-turn conversation using SDK chat pattern (simplified from examples)
      const history = messages.slice(0, -1)
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: msg.content || '' }]
        }))
        .filter(msg => msg.parts[0].text.trim() !== '');

      console.log(`📚 Chat history: ${history.length} messages`);
      
      // SDK built-in chat creation (pattern from examples)
      const chat = ai.chats.create({ model, history, config: requestConfig });
      
      if (!lastMessage.content?.trim()) {
        throw new Error('Message content cannot be empty');
      }
      
      // Simplified message sending (pattern from examples)
      const response = await chat.sendMessage({ message: lastMessage.content.trim() });
      return response.text;
    }
  }

  /**
   * Simplified error categorization inspired by Google examples
   * @private
   */
  private categorizeAndLogError(error: Error): void {
    const timestamp = new Date().toISOString();
    const errorContext = {
      message: error.message,
      name: error.name,
      keyIndex: this.currentKeyIndex + 1,
      totalKeys: this.apiKeys.length,
      timestamp
    };

    // Simplified error patterns inspired by examples
    const errorTypes = [
      { pattern: /contentunion|content.*required/i, type: 'CONTENT_VALIDATION', emoji: '📝', retryable: false },
      { pattern: /timeout/i, type: 'TIMEOUT', emoji: '⏰', retryable: true },
      { pattern: /api_key|401|unauthorized|permission_denied/i, type: 'AUTH', emoji: '🔑', retryable: false },
      { pattern: /quota|429|rate.*limit|resource_exhausted/i, type: 'QUOTA', emoji: '📊', retryable: true },
      { pattern: /network|fetch|enotfound|unavailable/i, type: 'NETWORK', emoji: '🌐', retryable: true },
      { pattern: /400|invalid|malformed|invalid_argument/i, type: 'REQUEST', emoji: '📝', retryable: false },
      { pattern: /5\d\d|internal|deadline_exceeded/i, type: 'SERVER', emoji: '🔧', retryable: true },
      { pattern: /model|not_found/i, type: 'MODEL', emoji: '🤖', retryable: false },
      { pattern: /safety|blocked/i, type: 'SAFETY', emoji: '🛡️', retryable: false }
    ];

    // Enhanced error categorization
    const errorCategory = this.categorizeApiError(error);
    
    const errorType = errorTypes.find(et => et.pattern.test(error.message)) || 
      { type: errorCategory.category, emoji: '❓', retryable: true };

    // Detailed logging with user guidance
    console.error(`${errorType.emoji} ${errorType.type} ERROR:`, {
      ...errorContext,
      retryable: errorType.retryable,
      explanation: errorCategory.explanation,
      suggestion: errorCategory.suggestion
    });
  }

  /**
   * Simplified error retry logic pattern from examples
   * @private
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /api_key|401|unauthorized|permission_denied/i,
      /400|invalid|malformed|invalid_argument/i,
      /model.*not.*found|not_found/i,
      /safety|blocked/i,
      /contentunion|content.*required/i
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Enhanced retry logic with adaptive delays
   * @private
   */
  private getRetryDelay(attempt: number, error: Error): number {
    const baseDelay = 1000; // 1 second
    
    // Adaptive delay based on error type
    if (error.message.includes('429') || error.message.includes('quota')) {
      // Longer delays for rate limit errors
      return baseDelay * Math.pow(3, attempt); // 3s, 9s, 27s
    } else if (error.message.includes('timeout')) {
      // Moderate delays for timeout errors
      return baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s
    } else {
      // Standard exponential backoff
      return baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
    }
  }

  /**
   * Track successful API key usage
   * @private
   */
  private trackKeySuccess(keyIndex: number): void {
    const health = this.keyHealth.get(keyIndex);
    if (health) {
      health.successCount++;
      health.lastUsed = new Date();
      health.consecutiveErrors = 0; // Reset consecutive errors
      this.keyHealth.set(keyIndex, health);
    }
  }

  /**
   * Track API key errors
   * @private
   */
  private trackKeyError(keyIndex: number, errorMessage: string): void {
    const health = this.keyHealth.get(keyIndex);
    if (health) {
      health.errorCount++;
      health.lastUsed = new Date();
      health.lastError = errorMessage;
      health.consecutiveErrors++;
      this.keyHealth.set(keyIndex, health);
    }
  }

  /**
   * Get comprehensive service statistics
   * Enhanced for 2025 monitoring
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const successRate = this.totalRequests > 0 ? 
      ((this.totalRequests - this.totalErrors) / this.totalRequests * 100).toFixed(2) : '0';
    
    const keyStats = Array.from(this.keyHealth.entries()).map(([index, health]) => ({
      keyIndex: index + 1,
      successCount: health.successCount,
      errorCount: health.errorCount,
      successRate: health.successCount + health.errorCount > 0 ? 
        (health.successCount / (health.successCount + health.errorCount) * 100).toFixed(2) : '0',
      lastUsed: health.lastUsed,
      lastError: health.lastError,
      consecutiveErrors: health.consecutiveErrors,
      isHealthy: health.consecutiveErrors < 3 // Consider unhealthy after 3 consecutive errors
    }));

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      successRate: `${successRate}%`,
      currentKeyIndex: this.currentKeyIndex + 1,
      totalKeys: this.apiKeys.length,
      keyStats,
      healthyKeys: keyStats.filter(k => k.isHealthy).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Utility function to create delays
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get enhanced available models with capabilities detection
   * Updated for 2025 with real-time capability detection
   * @returns Array of model information with detected capabilities
   */
  async getAvailableModelsWithCapabilities() {
    // Import model definitions
    const { GEMINI_MODELS, getModelCapabilities } = await import('../config/gemini');
    
    const modelsWithCapabilities = GEMINI_MODELS.map(model => {
      const capabilities = getModelCapabilities(model.id);
      
      return {
        ...model,
        capabilities: {
          supportsThinking: capabilities.supportsThinking,
          supportsGrounding: capabilities.supportsGrounding,
          supportsUrlContext: capabilities.supportsUrlContext,
          supportsImageGeneration: model.supportsImageGeneration || false,
          supportsVision: model.supportsVision,
          supportsAudio: model.supportsAudio || false,
          supportsVideo: model.supportsVideo || false,
          supportsPdf: model.supportsPdf || false,
          supportsLive: model.supportsLive || false,
          maxContextTokens: capabilities.maxContextTokens,
        },
        // Add performance recommendations based on capabilities
        recommendations: this.getModelRecommendations(model.id, capabilities),
      };
    });

    console.log(`📊 Model capabilities detected for ${modelsWithCapabilities.length} models`);
    return modelsWithCapabilities;
  }

  /**
   * Get model performance recommendations based on capabilities
   * @private
   */
  private getModelRecommendations(modelId: string, capabilities: ModelCapabilities) {
    const recommendations: string[] = [];

    if (capabilities.supportsThinking) {
      recommendations.push('Best for complex reasoning and analysis');
    }

    if (capabilities.supportsGrounding) {
      recommendations.push('Can access real-time information via Google Search');
    }

    if (capabilities.supportsUrlContext) {
      recommendations.push('Can analyze web page content directly');
    }

    if (modelId.includes('flash')) {
      recommendations.push('Optimized for speed and cost efficiency');
    }

    if (modelId.includes('pro')) {
      recommendations.push('Premium model for highest quality outputs');
    }

    if (modelId.includes('lite')) {
      recommendations.push('Most cost-effective option');
    }

    if (modelId.includes('imagen')) {
      recommendations.push('Specialized for high-quality image generation');
    }

    if (modelId.includes('gemma-3')) {
      recommendations.push('Open-source model optimized for instruction-following');
      recommendations.push('Excellent for coding and technical tasks');
      recommendations.push('High-performance with 27 billion parameters');
    }

    if (capabilities.maxContextTokens > 500000) {
      recommendations.push('Supports very long conversations and documents');
    }

    return recommendations;
  }

  /**
   * Auto-detect optimal model for a given task
   * Uses content analysis and requirements to recommend best model
   * @param content - Task content to analyze
   * @param requirements - Specific requirements for the task
   * @returns Recommended model ID with reasoning
   */
  async getOptimalModelForTask(
    content: string,
    requirements?: {
      speed?: 'fast' | 'balanced' | 'quality';
      needsGrounding?: boolean;
      needsUrlContext?: boolean;
      needsThinking?: boolean;
      needsVision?: boolean;
      needsImageGeneration?: boolean;
      maxCost?: 'low' | 'medium' | 'high';
      contextLength?: 'short' | 'medium' | 'long' | 'very_long';
    }
  ): Promise<{
    recommendedModel: string;
    reasoning: string[];
    alternatives: Array<{ model: string; reason: string }>;
  }> {
    const { GEMINI_MODELS, getModelCapabilities, getOptimalThinkingConfig } = await import('../config/gemini');
    const reqs = requirements || {};
    const reasoning: string[] = [];
    const alternatives: Array<{ model: string; reason: string }> = [];

    // Analyze content to understand task type
    const contentLower = content.toLowerCase();
    const isComplexTask = contentLower.includes('analyze') || contentLower.includes('compare') || contentLower.includes('reasoning');
    const needsRecentInfo = contentLower.includes('latest') || contentLower.includes('recent') || contentLower.includes('today');
    const isCreativeTask = contentLower.includes('creative') || contentLower.includes('story') || contentLower.includes('poem');
    const isCodingTask = contentLower.includes('code') || contentLower.includes('program') || contentLower.includes('function');

    // Filter models based on hard requirements
    let candidateModels = GEMINI_MODELS.filter(model => {
      const caps = getModelCapabilities(model.id);
      
      // Check essential requirements
      if (reqs.needsGrounding && !caps.supportsGrounding) return false;
      if (reqs.needsUrlContext && !caps.supportsUrlContext) return false;
      if (reqs.needsThinking && !caps.supportsThinking) return false;
      if (reqs.needsVision && !model.supportsVision) return false;
      if (reqs.needsImageGeneration && !model.supportsImageGeneration) return false;
      if (reqs.maxCost && model.costTier && this.compareCostTier(model.costTier, reqs.maxCost) > 0) return false;
      
      return true;
    });

    if (candidateModels.length === 0) {
      reasoning.push('No models meet all requirements, using fallback selection');
      candidateModels = GEMINI_MODELS.filter(m => !m.id.startsWith('imagen-')); // At least exclude pure image models
    }

    // Score models based on task and preferences
    const scoredModels = candidateModels.map(model => {
      let score = 0;
      const caps = getModelCapabilities(model.id);
      const modelReasoning: string[] = [];

      // Base quality scoring
      if (model.id.includes('2.5-pro')) {
        score += 10;
        modelReasoning.push('Highest quality model');
      } else if (model.id.includes('2.5-flash')) {
        score += 8;
        modelReasoning.push('Best balance of quality and speed');
      } else if (model.id.includes('2.0-flash')) {
        score += 6;
        modelReasoning.push('Good performance with latest features');
      }

      // Task-specific scoring
      if (isComplexTask && caps.supportsThinking) {
        score += 5;
        modelReasoning.push('Excellent for complex reasoning with thinking capability');
      }

      if (needsRecentInfo && caps.supportsGrounding) {
        score += 4;
        modelReasoning.push('Can access real-time information');
      }

      if (isCodingTask && model.id.includes('pro')) {
        score += 3;
        modelReasoning.push('Optimal for advanced coding tasks');
      }

      if (isCreativeTask && !model.id.includes('lite')) {
        score += 2;
        modelReasoning.push('Good for creative content generation');
      }

      // Speed preference scoring
      if (reqs.speed === 'fast') {
        if (model.id.includes('lite')) score += 4;
        else if (model.id.includes('flash')) score += 2;
        modelReasoning.push('Optimized for fast responses');
      } else if (reqs.speed === 'quality') {
        if (model.id.includes('pro')) score += 4;
        modelReasoning.push('Prioritizes output quality');
      }

      // Cost preference scoring
      if (reqs.maxCost === 'low' && model.costTier === 'low') {
        score += 3;
        modelReasoning.push('Cost-efficient option');
      } else if (reqs.maxCost === 'high' && model.costTier === 'high') {
        score += 2;
        modelReasoning.push('Premium option with best capabilities');
      }

      // Context length scoring
      if (reqs.contextLength === 'very_long' && caps.maxContextTokens > 1000000) {
        score += 3;
        modelReasoning.push('Supports very long contexts');
      }

      return {
        model: model.id,
        score,
        reasoning: modelReasoning,
        costTier: model.costTier || 'medium'
      };
    });

    // Sort by score and select best
    scoredModels.sort((a, b) => b.score - a.score);
    
    const winner = scoredModels[0];
    const runnerUps = scoredModels.slice(1, 4); // Top 3 alternatives

    reasoning.push(`Selected ${winner.model} (Score: ${winner.score})`);
    reasoning.push(...winner.reasoning);

    alternatives.push(...runnerUps.map(alt => ({
      model: alt.model,
      reason: `Alternative choice (Score: ${alt.score}) - ${alt.reasoning.join(', ')}`
    })));

    console.log(`🎯 Optimal model selection: ${winner.model} with score ${winner.score}`);

    return {
      recommendedModel: winner.model,
      reasoning,
      alternatives
    };
  }

  /**
   * Compare cost tiers for filtering
   * @private
   */
  private compareCostTier(tier1: string, tier2: string): number {
    const tierOrder = { 'low': 1, 'medium': 2, 'high': 3 };
    return (tierOrder[tier1 as keyof typeof tierOrder] || 2) - (tierOrder[tier2 as keyof typeof tierOrder] || 2);
  }

  /**
   * Batch validate all API keys with retry logic to distinguish temporary vs permanent failures
   * Tests each key multiple times to identify persistent issues
   * @returns Promise with detailed validation results for each key
   */
  async batchValidateApiKeys(): Promise<{
    totalKeys: number;
    validKeys: number;
    temporarilyInvalidKeys: number;
    permanentlyInvalidKeys: number;
    results: Array<{
      keyIndex: number;
      masked: string;
      status: 'valid' | 'temporarily_invalid' | 'permanently_invalid';
      attempts: number;
      errors: string[];
      averageResponseTime?: number;
      lastSuccessful?: boolean;
    }>;
  }> {
    console.log('🔍 Starting enhanced batch validation of all API keys...');
    
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys available for validation');
    }

    const results = [];
    let validCount = 0;
    let tempInvalidCount = 0;
    let permInvalidCount = 0;

    // Test each API key with multiple attempts
    for (let i = 0; i < this.apiKeys.length; i++) {
      console.log(`🔑 Validating API key ${i + 1}/${this.apiKeys.length}...`);
      
      const apiKey = this.apiKeys[i];
      const validationResult = await this.validateKeyWithRetries(apiKey);
      
      results.push({
        keyIndex: i,
        masked: this.maskApiKey(apiKey),
        ...validationResult
      });

      // Count results
      if (validationResult.status === 'valid') {
        validCount++;
        console.log(`✅ API key ${i + 1} is valid (avg: ${validationResult.averageResponseTime}ms)`);
      } else if (validationResult.status === 'temporarily_invalid') {
        tempInvalidCount++;
        console.log(`⚠️ API key ${i + 1} is temporarily invalid (${validationResult.errors.join(', ')})`);
      } else {
        permInvalidCount++;
        console.log(`❌ API key ${i + 1} is permanently invalid (${validationResult.errors.join(', ')})`);
      }
    }

    const summary = {
      totalKeys: this.apiKeys.length,
      validKeys: validCount,
      temporarilyInvalidKeys: tempInvalidCount,
      permanentlyInvalidKeys: permInvalidCount,
      results
    };

    console.log(`📊 Enhanced validation completed: ${validCount} valid, ${tempInvalidCount} temporary issues, ${permInvalidCount} permanent issues`);
    return summary;
  }

  /**
   * Validate a single API key with multiple attempts to distinguish temporary vs permanent issues
   * @private
   */
  private async validateKeyWithRetries(apiKey: string): Promise<{
    status: 'valid' | 'temporarily_invalid' | 'permanently_invalid';
    attempts: number;
    errors: string[];
    averageResponseTime?: number;
    lastSuccessful?: boolean;
  }> {
    const maxAttempts = 3;
    const errors: string[] = [];
    const responseTimes: number[] = [];
    let successfulAttempts = 0;
    let lastAttemptSuccessful = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startTime = Date.now();
      
      try {
        const isValid = await this.validateSingleApiKey(apiKey);
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        if (isValid) {
          successfulAttempts++;
          lastAttemptSuccessful = true;
          console.debug(`✓ Key validation attempt ${attempt}/${maxAttempts} successful (${responseTime}ms)`);
        } else {
          errors.push(`Attempt ${attempt}: Authentication failed`);
          lastAttemptSuccessful = false;
          console.debug(`✗ Key validation attempt ${attempt}/${maxAttempts} failed: Authentication error`);
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Attempt ${attempt}: ${errorMessage}`);
        lastAttemptSuccessful = false;
        console.debug(`✗ Key validation attempt ${attempt}/${maxAttempts} failed: ${errorMessage} (${responseTime}ms)`);
        
        // Add delay between retries for rate limiting
        if (attempt < maxAttempts) {
          await this.delay(1000 + (attempt * 500)); // 1.5s, 2s delays
        }
      }
    }

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : undefined;

    // Determine status based on success rate and error patterns
    if (successfulAttempts === maxAttempts) {
      return {
        status: 'valid',
        attempts: maxAttempts,
        errors: [],
        averageResponseTime,
        lastSuccessful: true
      };
    } else if (successfulAttempts > 0) {
      // Some attempts succeeded - likely temporary issues (rate limiting, network, etc.)
      return {
        status: 'temporarily_invalid',
        attempts: maxAttempts,
        errors,
        averageResponseTime,
        lastSuccessful: lastAttemptSuccessful
      };
    } else {
      // No attempts succeeded - check error patterns to determine if permanent
      const isPermanent = errors.some(error => 
        error.includes('401') || 
        error.includes('unauthorized') || 
        error.includes('API_KEY') ||
        error.includes('invalid') ||
        error.includes('Authentication failed')
      );
      
      return {
        status: isPermanent ? 'permanently_invalid' : 'temporarily_invalid',
        attempts: maxAttempts,
        errors,
        averageResponseTime,
        lastSuccessful: false
      };
    }
  }

  /**
   * Remove invalid API keys based on validation results with granular control
   * @param validationResults - Results from batchValidateApiKeys
   * @param removeType - Type of keys to remove: 'permanent_only', 'temporary_only', 'all_invalid'
   * @returns Details about removed keys
   */
  removeInvalidApiKeys(
    validationResults: Awaited<ReturnType<typeof this.batchValidateApiKeys>>,
    removeType: 'permanent_only' | 'temporary_only' | 'all_invalid' = 'permanent_only'
  ): {
    removedKeys: Array<{
      masked: string;
      reason: string;
      status: string;
    }>;
    remainingKeys: number;
    removedCount: {
      permanent: number;
      temporary: number;
      total: number;
    };
  } {
    console.log(`🧹 Removing ${removeType} API keys...`);
    
    let targetStatuses: string[] = [];
    switch (removeType) {
      case 'permanent_only':
        targetStatuses = ['permanently_invalid'];
        break;
      case 'temporary_only':
        targetStatuses = ['temporarily_invalid'];
        break;
      case 'all_invalid':
        targetStatuses = ['temporarily_invalid', 'permanently_invalid'];
        break;
    }

    const keysToRemove = validationResults.results
      .filter(result => targetStatuses.includes(result.status))
      .map(result => result.keyIndex)
      .sort((a, b) => b - a); // Sort in descending order to remove from end first

    const removedKeys = [];
    let permanentCount = 0;
    let temporaryCount = 0;
    
    // Remove invalid keys (starting from the end to maintain indices)
    for (const keyIndex of keysToRemove) {
      const removedKey = this.apiKeys[keyIndex];
      const result = validationResults.results.find(r => r.keyIndex === keyIndex);
      
      if (result) {
        const reason = result.errors.length > 0 ? result.errors[0] : 'Validation failed';
        removedKeys.push({
          masked: this.maskApiKey(removedKey),
          reason,
          status: result.status
        });

        if (result.status === 'permanently_invalid') {
          permanentCount++;
        } else if (result.status === 'temporarily_invalid') {
          temporaryCount++;
        }
      }
      
      this.apiKeys.splice(keyIndex, 1);
      
      // Remove from health tracking
      this.keyHealth.delete(keyIndex);
    }

    // Re-index health tracking for remaining keys
    const newHealthMap = new Map();
    this.apiKeys.forEach((_, index) => {
      // Find the original health data by checking what keys are left
      let foundHealth = null;
      for (const [oldIndex, health] of this.keyHealth.entries()) {
        if (oldIndex <= index + keysToRemove.filter(ki => ki <= index).length) {
          foundHealth = health;
          break;
        }
      }
      
      newHealthMap.set(index, foundHealth || {
        successCount: 0,
        errorCount: 0,
        lastUsed: new Date(0),
        consecutiveErrors: 0
      });
    });
    this.keyHealth = newHealthMap;

    // Reset current key index if needed
    if (this.currentKeyIndex >= this.apiKeys.length) {
      this.currentKeyIndex = 0;
    }

    const result = {
      removedKeys,
      remainingKeys: this.apiKeys.length,
      removedCount: {
        permanent: permanentCount,
        temporary: temporaryCount,
        total: removedKeys.length
      }
    };

    console.log(`🧹 Removed ${result.removedCount.total} keys (${permanentCount} permanent, ${temporaryCount} temporary), ${this.apiKeys.length} keys remaining`);
    return result;
  }

  /**
   * Get masked version of API key for display
   * Shows only the last 6 characters with asterisks for the rest
   * @private
   */
  private maskApiKey(key: string): string {
    if (key.length <= 6) return '*'.repeat(key.length);
    return '*'.repeat(key.length - 6) + key.slice(-6);
  }

  /**
   * Validate a single API key with a simple test request
   * @private
   */
  private async validateSingleApiKey(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: 'Test validation' }] }],
        generationConfig: {
          maxOutputTokens: 10,
        }
      });
      
      return response.text && response.text.length > 0;
    } catch (error) {
      // Log the specific error for debugging
      console.debug(`Key validation failed:`, error);
      return false;
    }
  }







  /**
   * Analyze URLs with context understanding
   * Uses experimental URL Context tool for deep web content analysis
   * @param urls - Array of URLs to analyze
   * @param query - Analysis query or question about the URLs
   * @param model - Model to use (defaults to gemini-2.0-flash)
   * @returns Promise<{ text: string; urlContextMetadata?: UrlContextMetadata }>
   */
  async analyzeUrls(
    urls: string[],
    query: string,
    model: string = 'gemini-2.5-flash'
  ): Promise<{ text: string; urlContextMetadata?: UrlContextMetadata }> {
    // Validate prerequisites
    if (this.apiKeys.length === 0) {
      const error = new Error('No API keys available. Please set API keys first.');
      console.error('❌ API Key Error:', error.message);
      throw error;
    }

    if (!urls || urls.length === 0) {
      const error = new Error('No URLs provided for analysis');
      console.error('❌ Input Validation Error:', error.message);
      throw error;
    }

    if (urls.length > 20) {
      const error = new Error('Maximum 20 URLs allowed per request');
      console.error('❌ URL Limit Error:', error.message);
      throw error;
    }

    console.log(`🌐 Starting URL analysis with model: ${model}`);
    console.log(`📝 Analyzing ${urls.length} URLs`);
    console.log(`❓ Query: ${query}`);

    let lastError: Error | null = null;
    const initialKeyIndex = this.currentKeyIndex;

    // Try each API key until one succeeds
    do {
      try {
        console.log(`🔄 Attempting URL analysis with API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
        this.totalRequests++;
        
        const result = await this.executeUrlAnalysis(urls, query, model);
        
        // Track success
        this.trackKeySuccess(this.currentKeyIndex);
        console.log('✅ URL analysis successful');
        return result;
      } catch (error) {
        lastError = error as Error;
        this.totalErrors++;
        
        // Track error for current key
        this.trackKeyError(this.currentKeyIndex, (error as Error).message);
        
        console.error(`❌ URL analysis API key ${this.currentKeyIndex + 1} failed:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        });

        // Move to next key
        this.moveToNextKey();

        // If we've tried all keys, break
        if (this.currentKeyIndex === initialKeyIndex) {
          console.log('💥 All API keys failed for URL analysis');
          break;
        }
      }
    } while (this.currentKeyIndex !== initialKeyIndex);

    // All API keys exhausted
    console.error('💥 All API keys failed for URL analysis');
    throw lastError || new Error('Failed to analyze URLs with any API key');
  }

  /**
   * Execute URL analysis with timeout handling
   * @private
   */
  private async executeUrlAnalysis(
    urls: string[],
    query: string,
    model: string
  ): Promise<{ text: string; urlContextMetadata?: UrlContextMetadata }> {
    const ai = this.createGenAI();
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`URL analysis timeout after ${this.DEFAULT_TIMEOUT}ms`));
      }, this.DEFAULT_TIMEOUT);
    });

    try {
      const result = await Promise.race([
        this.handleUrlAnalysis(ai, urls, query, model),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      this.categorizeAndLogError(error as Error);
      throw error;
    }
  }

  /**
   * Handle URL analysis with URL Context tool
   * @private
   */
  private async handleUrlAnalysis(
    ai: GoogleGenAI,
    urls: string[],
    query: string,
    model: string
  ): Promise<{ text: string; urlContextMetadata?: UrlContextMetadata }> {
    console.log(`🌐 Analyzing URLs: ${urls.join(', ')}`);
    
    // Build the analysis prompt
    const analysisPrompt = `${query}

URLs to analyze:
${urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

Please provide a comprehensive analysis based on the content of these URLs.`;

    // Configure URL Context tool
    const tools = [{ urlContext: {} }];
    
    const requestConfig = {
      tools,
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1000000,
      ...(model.includes('2.5') && {
        thinkingConfig: {
          thinkingBudget: 30000, // Higher budget for analysis tasks
        }
      }),
    };
    
    console.log(`🔧 Executing URL analysis with URL Context tool`);
    
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
      config: requestConfig
    });
    
    if (!response.text) {
      throw new Error('Empty response received from URL analysis');
    }

    const result: { text: string; urlContextMetadata?: UrlContextMetadata } = {
      text: response.text
    };

    // Extract URL context metadata if available
    if (response.candidates?.[0]?.urlContextMetadata) {
      result.urlContextMetadata = response.candidates[0].urlContextMetadata as UrlContextMetadata;
      console.log(`📊 URL analysis completed with ${result.urlContextMetadata.urlMetadata?.length || 0} processed URLs`);
    }

    return result;
  }
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Gemini API connection...');
      
      if (this.apiKeys.length === 0) {
        throw new Error('No API keys available for connection test.');
      }

      const ai = this.createGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: 'Hello, this is a connection test.' }] }]
      });
      
      console.log('✅ Connection test successful');
      console.log('📝 Test response:', response.text.substring(0, 100) + '...');
      
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      this.categorizeAndLogError(error as Error);
      return false;
    }
  }
}

// Initialize service with environment configuration
const envConfig = loadEnvConfig();
export const geminiService = new GeminiService();