/**
 * Enhanced Context Management Utility
 * Advanced conversation optimization with model-aware token management
 * Updated for 2025 with Gemini 2.5 capabilities and intelligent summarization
 */

import type { Message } from '../types/chat';

export interface ContextConfig {
  maxHistoryLength: number;
  maxTokens: number;
  prioritizeRecent: boolean;
  preserveSystemMessages: boolean;
  summaryEnabled: boolean;
  intelligentSummarization?: boolean;
  adaptiveTokenManagement?: boolean;
  preserveFileAttachments?: boolean;
}

export class ContextManager {
  private config: ContextConfig;
  private readonly AVERAGE_TOKENS_PER_CHAR = 0.25; // Rough estimate for token counting

  constructor(config: ContextConfig) {
    this.config = {
      // Enhanced defaults for 2025
      intelligentSummarization: true,
      adaptiveTokenManagement: true,
      preserveFileAttachments: true,
      ...config
    };
  }

  /**
   * Update context manager configuration
   */
  updateConfig(newConfig: Partial<ContextConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Enhanced context optimization with model-aware management
   */
  optimizeContext(messages: Message[], modelId?: string): Message[] {
    if (messages.length <= this.config.maxHistoryLength && 
        this.estimateTokens(messages) <= this.config.maxTokens) {
      return messages;
    }

    console.log(`🧠 Enhanced context optimization: ${messages.length} messages, ~${this.estimateTokens(messages)} tokens`);

    // Use model-aware optimization
    if (this.config.adaptiveTokenManagement && modelId) {
      return this.adaptiveOptimization(messages, modelId);
    }

    // Strategy 1: Intelligent summarization with preservation
    if (this.config.intelligentSummarization) {
      return this.intelligentSummarizationOptimization(messages);
    }

    // Strategy 2: Keep recent messages + important ones
    if (this.config.prioritizeRecent) {
      return this.prioritizeRecentMessages(messages);
    }

    // Strategy 3: Sliding window approach
    return this.slidingWindowTruncation(messages);
  }

  /**
   * Adaptive optimization based on model capabilities
   */
  private adaptiveOptimization(messages: Message[], modelId: string): Message[] {
    // Get model-specific token limits
    const modelTokenLimits = this.getModelTokenLimits(modelId);
    const targetTokens = Math.min(this.config.maxTokens, modelTokenLimits.context * 0.7); // Use 70% of context

    console.log(`🎯 Adaptive optimization for ${modelId}: targeting ${targetTokens} tokens`);

    // Start from the end and work backwards, preserving important messages
    const optimizedMessages: Message[] = [];
    let currentTokens = 0;
    
    // Always include the last message (current user input)
    const lastMessage = messages[messages.length - 1];
    optimizedMessages.unshift(lastMessage);
    currentTokens += this.estimateMessageTokens(lastMessage);

    // Work backwards through messages
    for (let i = messages.length - 2; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = this.estimateMessageTokens(message);
      
      // Check if adding this message would exceed limits
      if (currentTokens + messageTokens > targetTokens) {
        // If we have room for a summary, create one for the remaining messages
        if (this.config.intelligentSummarization && i > 0) {
          const summary = this.createIntelligentSummary(messages.slice(0, i + 1));
          if (summary && currentTokens + this.estimateMessageTokens(summary) <= targetTokens) {
            optimizedMessages.unshift(summary);
          }
        }
        break;
      }
      
      // Add message if it fits
      optimizedMessages.unshift(message);
      currentTokens += messageTokens;
      
      // Preserve important messages (with files, system messages, etc.)
      if (this.isImportantMessage(message)) {
        console.log(`💎 Preserved important message: ${message.role} with ${message.files?.length || 0} files`);
      }
    }

    console.log(`✅ Adaptive optimization complete: ${optimizedMessages.length} messages, ~${currentTokens} tokens`);
    return optimizedMessages;
  }

  /**
   * Intelligent summarization with content preservation
   */
  private intelligentSummarizationOptimization(messages: Message[]): Message[] {
    const { maxHistoryLength, maxTokens } = this.config;
    
    if (messages.length <= maxHistoryLength) {
      return messages;
    }

    // Keep recent messages
    const recentCount = Math.floor(maxHistoryLength * 0.6);
    const recentMessages = messages.slice(-recentCount);
    
    // Keep important messages from earlier conversation
    const earlierMessages = messages.slice(0, -recentCount);
    const importantEarlierMessages = this.extractImportantMessages(earlierMessages, maxHistoryLength - recentCount);
    
    // Create summary for non-preserved earlier messages
    const summaryCandidate = earlierMessages.filter(msg => 
      !importantEarlierMessages.some(imp => imp.id === msg.id)
    );
    
    let result = [...importantEarlierMessages, ...recentMessages];
    
    if (summaryCandidate.length > 0 && this.config.summaryEnabled) {
      const summary = this.createIntelligentSummary(summaryCandidate);
      if (summary) {
        result = [summary, ...importantEarlierMessages, ...recentMessages];
      }
    }

    // Final token check
    if (this.estimateTokens(result) > maxTokens) {
      // Fall back to simpler truncation
      result = this.slidingWindowTruncation(result);
    }

    console.log(`🧠 Intelligent summarization: ${messages.length} → ${result.length} messages`);
    return result;
  }

  /**
   * Extract important messages based on multiple criteria
   */
  private extractImportantMessages(messages: Message[], maxCount: number): Message[] {
    const important = messages.filter(msg => this.isImportantMessage(msg));
    
    // If too many important messages, prioritize by recency and file attachments
    if (important.length > maxCount) {
      return important
        .sort((a, b) => {
          // Prioritize messages with files
          if (a.files?.length && !b.files?.length) return -1;
          if (!a.files?.length && b.files?.length) return 1;
          
          // Then by recency
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, maxCount);
    }
    
    return important;
  }

  /**
   * Determine if a message is important and should be preserved
   */
  private isImportantMessage(message: Message): boolean {
    // Messages with file attachments are important
    if (this.config.preserveFileAttachments && message.files?.length) {
      return true;
    }
    
    // System messages or messages with metadata
    if (message.metadata?.groundingMetadata || message.metadata?.urlContextMetadata) {
      return true;
    }
    
    // Long messages (likely contain important information)
    if (message.content.length > 500) {
      return true;
    }
    
    // Messages containing code blocks
    if (message.content.includes('```')) {
      return true;
    }
    
    // Messages with specific keywords indicating importance
    const importantKeywords = ['error', 'warning', 'important', 'note:', 'summary:', 'conclusion:'];
    const contentLower = message.content.toLowerCase();
    if (importantKeywords.some(keyword => contentLower.includes(keyword))) {
      return true;
    }
    
    return false;
  }

  /**
   * Create intelligent summary of conversation segments
   */
  createIntelligentSummary(messages: Message[]): Message | null {
    if (messages.length === 0) return null;
    
    // Group messages by conversation turns
    const turns = this.groupMessagesByTurns(messages);
    
    // Create contextual summary
    const summaryParts: string[] = [];
    
    // Add topic summary
    const topics = this.extractTopics(messages);
    if (topics.length > 0) {
      summaryParts.push(`Topics discussed: ${topics.join(', ')}`);
    }
    
    // Add key interactions summary
    const keyInteractions = this.summarizeKeyInteractions(turns);
    if (keyInteractions.length > 0) {
      summaryParts.push(...keyInteractions);
    }
    
    // Add any code or file references
    const codeRefs = this.extractCodeReferences(messages);
    if (codeRefs.length > 0) {
      summaryParts.push(`Code/files referenced: ${codeRefs.join(', ')}`);
    }
    
    if (summaryParts.length === 0) {
      summaryParts.push(`Previous conversation covered ${turns.length} topics with ${messages.length} messages.`);
    }
    
    const summaryContent = `[Context Summary: ${summaryParts.join('. ')}]`;
    
    return {
      id: `summary-${Date.now()}`,
      role: 'assistant' as const,
      content: summaryContent,
      timestamp: new Date(),
      metadata: {
        modelUsed: 'context-manager',
        summarized: messages.length,
      }
    };
  }

  /**
   * Get model-specific token limits
   */
  private getModelTokenLimits(modelId: string) {
    const limits: Record<string, { context: number; output: number }> = {
      'gemini-2.5-pro': { context: 2000000, output: 1000000 },
      'gemini-2.5-flash': { context: 1000000, output: 1000000 },
      'gemini-2.5-flash-lite': { context: 8192, output: 8192 },
      'gemini-2.0-flash': { context: 1000000, output: 1000000 },
    };
    
    return limits[modelId] || { context: 32768, output: 8192 };
  }

  /**
   * Enhanced token estimation
   */
  estimateTokens(messages: Message[]): number {
    return messages.reduce((total, message) => total + this.estimateMessageTokens(message), 0);
  }

  /**
   * Estimate tokens for a single message
   */
  private estimateMessageTokens(message: Message): number {
    let tokens = message.content.length * this.AVERAGE_TOKENS_PER_CHAR;
    
    // Add tokens for file attachments
    if (message.files?.length) {
      tokens += message.files.length * 100; // Rough estimate for file processing overhead
    }
    
    // Add tokens for metadata
    if (message.metadata) {
      tokens += 50; // Rough estimate for metadata overhead
    }
    
    return Math.ceil(tokens);
  }

  /**
   * Group messages into conversation turns
   */
  private groupMessagesByTurns(messages: Message[]): Array<{ user: Message; assistant?: Message }> {
    const turns: Array<{ user: Message; assistant?: Message }> = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (message.role === 'user') {
        const turn = { user: message, assistant: undefined as Message | undefined };
        
        // Look for the next assistant message
        if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
          turn.assistant = messages[i + 1];
          i++; // Skip the assistant message in the next iteration
        }
        
        turns.push(turn);
      }
    }
    
    return turns;
  }

  /**
   * Extract main topics from conversation
   */
  private extractTopics(messages: Message[]): string[] {
    const topics = new Set<string>();
    
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      
      // Look for explicit topic markers
      const topicMarkers = content.match(/(?:about|regarding|discussing|topic:)\s+([a-zA-Z\s]+)/g);
      topicMarkers?.forEach(marker => {
        const topic = marker.split(/(?:about|regarding|discussing|topic:)\s+/)[1]?.trim();
        if (topic && topic.length > 2) {
          topics.add(topic.substring(0, 30));
        }
      });
      
      // Extract technical terms and proper nouns
      const technicalTerms = content.match(/\b[A-Z][a-zA-Z]+(?:\.[a-zA-Z]+)*\b/g);
      technicalTerms?.slice(0, 3).forEach(term => topics.add(term));
    });
    
    return Array.from(topics).slice(0, 5);
  }

  /**
   * Summarize key interaction patterns
   */
  private summarizeKeyInteractions(turns: Array<{ user: Message; assistant?: Message }>): string[] {
    const interactions: string[] = [];
    
    // Count question types
    const questions = turns.filter(turn => 
      turn.user.content.includes('?') || 
      turn.user.content.toLowerCase().startsWith('how') ||
      turn.user.content.toLowerCase().startsWith('what') ||
      turn.user.content.toLowerCase().startsWith('why')
    );
    
    if (questions.length > 0) {
      interactions.push(`${questions.length} questions asked and answered`);
    }
    
    // Count code-related interactions
    const codeInteractions = turns.filter(turn => 
      turn.user.content.includes('```') || 
      turn.assistant?.content.includes('```') ||
      turn.user.content.toLowerCase().includes('code')
    );
    
    if (codeInteractions.length > 0) {
      interactions.push(`${codeInteractions.length} code-related discussions`);
    }
    
    return interactions;
  }

  /**
   * Extract code and file references
   */
  private extractCodeReferences(messages: Message[]): string[] {
    const refs = new Set<string>();
    
    messages.forEach(message => {
      // Extract file paths
      const filePaths = message.content.match(/\b[\w-]+\.[\w]{2,4}\b/g);
      filePaths?.slice(0, 3).forEach(path => refs.add(path));
      
      // Extract function names
      const functions = message.content.match(/\b\w+\(\)/g);
      functions?.slice(0, 3).forEach(func => refs.add(func));
      
      // Add file attachment names
      message.files?.forEach(file => refs.add(file.name));
    });
    
    return Array.from(refs).slice(0, 5);
  }


  /**
   * Prioritize recent messages while keeping some important earlier ones
   */
  private prioritizeRecentMessages(messages: Message[]): Message[] {
    const { maxHistoryLength } = this.config;
    
    // Always keep the most recent messages
    const recentCount = Math.floor(maxHistoryLength * 0.7);
    const recentMessages = messages.slice(-recentCount);
    
    // Find important earlier messages to keep
    const earlierMessages = messages.slice(0, -recentCount);
    const importantEarlier = this.findImportantMessages(earlierMessages);
    
    // Calculate how many earlier messages we can keep
    const availableSlots = maxHistoryLength - recentMessages.length;
    const selectedEarlier = importantEarlier.slice(-availableSlots);
    
    const result = [...selectedEarlier, ...recentMessages];
    console.log(`📝 Context optimization: ${messages.length} → ${result.length} messages`);
    
    return result;
  }

  /**
   * Simple sliding window truncation
   */
  private slidingWindowTruncation(messages: Message[]): Message[] {
    const result = messages.slice(-this.config.maxHistoryLength);
    console.log(`📝 Sliding window: ${messages.length} → ${result.length} messages`);
    return result;
  }

  /**
   * Find important messages to preserve
   */
  private findImportantMessages(messages: Message[]): Message[] {
    return messages.filter(message => {
      // Keep messages with attachments
      if (message.files && message.files.length > 0) {
        return true;
      }

      // Keep longer messages (likely more important)
      if (message.content.length > 200) {
        return true;
      }

      // Keep messages with specific keywords
      const importantKeywords = [
        '重要', 'important', '关键', 'key', '总结', 'summary',
        '记住', 'remember', '注意', 'note', '问题', 'problem'
      ];
      
      const content = message.content.toLowerCase();
      if (importantKeywords.some(keyword => content.includes(keyword))) {
        return true;
      }

      return false;
    });
  }


  /**
   * Check if context needs optimization
   */
  needsOptimization(messages: Message[]): boolean {
    if (messages.length > this.config.maxHistoryLength) {
      return true;
    }
    
    const estimatedTokens = this.estimateTokens(messages);
    if (estimatedTokens > this.config.maxTokens) {
      return true;
    }
    
    return false;
  }

  /**
   * Create a summary of truncated messages
   */
  createSummary(truncatedMessages: Message[]): string {
    if (!this.config.summaryEnabled || truncatedMessages.length === 0) {
      return '';
    }

    const userMessages = truncatedMessages.filter(m => m.role === 'user');
    const assistantMessages = truncatedMessages.filter(m => m.role === 'assistant');
    
    let summary = '📋 对话摘要：\n';
    summary += `- 用户提问 ${userMessages.length} 次\n`;
    summary += `- 助手回答 ${assistantMessages.length} 次\n`;
    
    // Extract key topics
    const allContent = truncatedMessages.map(m => m.content).join(' ');
    const topics = this.extractKeyTopics(allContent);
    if (topics.length > 0) {
      summary += `- 主要话题：${topics.join('、')}\n`;
    }
    
    return summary;
  }

  /**
   * Extract key topics from conversation content
   */
  private extractKeyTopics(content: string): string[] {
    // Simple keyword extraction - in a real implementation, 
    // you might use more sophisticated NLP techniques
    const commonWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
      'for', 'of', 'with', 'by', 'as', 'is', 'are', 'was', 'were'
    ]);
    
    const words = content.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
    
    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // Return top 5 most frequent words
    return Array.from(wordCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }


  /**
   * Get current configuration
   */
  getConfig(): ContextConfig {
    return { ...this.config };
  }
}