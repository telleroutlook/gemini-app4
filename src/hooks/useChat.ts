import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import type { 
  Message, 
  Conversation, 
  FileAttachment, 
  ConversationConfig
} from '../types/chat';
import { geminiService } from '../services/gemini';
import type { GeminiResponse } from '../services/gemini';
import { getModelCapabilities, getOptimalThinkingConfig } from '../config/gemini';
import { useLocalStorage, useConversations } from './useLocalStorage';
import { loadApiKeysFromEnv } from '../utils/env';
import { ContextManager, type ContextConfig } from '../utils/contextManager';
import { generateAdvancedHTMLExport } from '../utils/exportRenderer';

// Helper function to extract URLs from message content
function extractUrlsFromMessage(content: string, maxUrls: number = 3): string[] {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  const matches = content.match(urlRegex) || [];
  return matches.slice(0, maxUrls);
}

// Helper function to escape HTML
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper function to convert text to HTML with basic formatting
function textToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

// Helper function to generate HTML export
function generateHTMLExport(conversation: any): string {
  const htmlContent = conversation.messages.map((message: any) => {
    const timestamp = new Date(message.timestamp).toLocaleString();
    const role = message.role === 'user' ? 'User' : 'Assistant';
    const roleClass = message.role === 'user' ? 'user-message' : 'assistant-message';
    
    return `
      <div class="message ${roleClass}">
        <div class="message-header">
          <span class="role">${role}</span>
          <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">
          <p>${textToHtml(message.content)}</p>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(conversation.title)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2em;
        }
        .header .meta {
            opacity: 0.9;
            font-size: 0.9em;
        }
        .conversation {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .message {
            margin-bottom: 25px;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #e0e0e0;
        }
        .user-message {
            background-color: #f0f9ff;
            border-left-color: #3b82f6;
        }
        .assistant-message {
            background-color: #f9fafb;
            border-left-color: #10b981;
        }
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 0.9em;
        }
        .role {
            font-weight: 600;
            color: #374151;
        }
        .timestamp {
            color: #6b7280;
        }
        .message-content {
            font-size: 1em;
            line-height: 1.7;
        }
        .message-content p {
            margin: 0 0 12px 0;
        }
        .message-content p:last-child {
            margin-bottom: 0;
        }
        code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #1f2937;
            color: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;
        }
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        strong {
            font-weight: 600;
            color: #111827;
        }
        em {
            font-style: italic;
            color: #374151;
        }
        @media print {
            body {
                background-color: white;
            }
            .header {
                background: #667eea !important;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${escapeHtml(conversation.title)}</h1>
        <div class="meta">
            <div>Created: ${new Date(conversation.createdAt).toLocaleString()}</div>
            <div>Updated: ${new Date(conversation.updatedAt).toLocaleString()}</div>
            <div>Model: ${conversation.model}</div>
        </div>
    </div>
    <div class="conversation">
        ${htmlContent}
    </div>
</body>
</html>
  `.trim();
}

// Helper function to generate PDF export
function generatePDFExport(conversation: any, filename: string, htmlContent?: string): void {
  // Use provided HTML content or generate a basic one
  const exportHtml = htmlContent || generateHTMLExport(conversation);
  const blob = new Blob([exportHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Open in new window for printing to PDF
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print();
      }, 1000); // Increased timeout to allow Mermaid rendering
    });
  } else {
    // Fallback: download HTML and instruct user to print
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_for_pdf.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Show toast with instructions
    import('react-hot-toast').then(({ toast }) => {
      toast('HTML file downloaded. Open it in your browser and use "Print to PDF" feature.', {
        duration: 5000,
      });
    });
  }
  
  URL.revokeObjectURL(url);
}

export function useChat() {
  // Use new IndexedDB storage system
  const {
    conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
    saveConversation,
    deleteConversation: dbDeleteConversation,
    cleanupOldConversations,
    getStorageUsage,
  } = useConversations();
  
  const [currentConversationId, setCurrentConversationId] = useLocalStorage<string | null>('current-conversation', null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [apiKeys, setApiKeys] = useLocalStorage<string[]>('gemini-api-keys', []);
  const [selectedModel, setSelectedModel] = useLocalStorage('selected-model', 'gemini-2.0-flash');
  
  // Enhanced default configurations with grounding and URL context
  const [defaultConversationConfig, setDefaultConversationConfig] = useLocalStorage<ConversationConfig>('default-conversation-config', {
    thinkingConfig: {
      enabled: true,
      budget: 15000, // Will be auto-adjusted based on content
      showThinkingProcess: false,
    },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1000000,
    },
    groundingConfig: {
      enabled: false, // User can enable when needed
      useGoogleSearch: true,
      maxResults: 5,
    },
    urlContextConfig: {
      enabled: false, // User can enable when needed
      maxUrls: 3,
    },
    // Interface settings with sensible defaults
    streamingEnabled: true,
    typewriterEffect: true,
    smartLoadingIndicators: true,
    realtimeFeedback: true,
  });

  // Enhanced context management configuration
  const [contextConfig, setContextConfig] = useLocalStorage<ContextConfig>('context-config', {
    maxHistoryLength: 20,
    maxTokens: 100000, // Increased for enhanced context management
    prioritizeRecent: true,
    preserveSystemMessages: true,
    summaryEnabled: true,
    intelligentSummarization: true,
    adaptiveTokenManagement: true,
    preserveFileAttachments: true,
  });

  // Create context manager instance
  const contextManager = useMemo(() => new ContextManager(contextConfig), [contextConfig]);

  // Load API keys from environment variables on initialization
  useEffect(() => {
    const envApiKeys = loadApiKeysFromEnv();
    if (envApiKeys.length > 0) {
      // Merge environment keys with stored keys, avoiding duplicates
      const allKeys = [...new Set([...envApiKeys, ...apiKeys])];
      if (allKeys.length !== apiKeys.length) {
        setApiKeys(allKeys);
        toast.success(`Loaded ${envApiKeys.length} API key(s) from environment variables`);
      }
    }
  }, [apiKeys, setApiKeys]); // Only run once on mount

  const currentConversation = conversations.find(conv => conv.id === currentConversationId);

  const createNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: selectedModel,
      config: defaultConversationConfig,
    };

    // 使用新的保存方法
    saveConversation(newConversation);
    setCurrentConversationId(newConversation.id);
    return newConversation;
  }, [selectedModel, defaultConversationConfig, saveConversation, setCurrentConversationId]);

  const sendMessage = useCallback(async (content: string, files?: FileAttachment[]) => {
    if (!apiKeys || apiKeys.length === 0) {
      toast.error('Please set your Gemini API keys first');
      return;
    }

    geminiService.setApiKeys(apiKeys);
    
    // Set up model switch callback to notify user
    geminiService.setModelSwitchCallback((fromModel: string, toModel: string, reason: string) => {
      toast.success(`🔄 Switched to ${toModel}: ${reason}`, {
        duration: 6000,
        icon: '🤖',
      });
    });

    // Ensure we have a current conversation
    let conversation = currentConversation;
    if (!conversation) {
      conversation = createNewConversation();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      files,
    };

    // Update conversation, add user message
    const updatedMessages = [...conversation.messages, userMessage];
    
    // Get model capabilities and optimize configuration
    const modelCapabilities = getModelCapabilities(selectedModel);
    
    // Auto-adjust thinking configuration based on content
    const optimalThinking = getOptimalThinkingConfig(content, selectedModel);
    
    // Enhanced conversation config with intelligent defaults
    const enhancedConfig = {
      ...conversation.config,
      thinkingConfig: {
        ...conversation.config?.thinkingConfig,
        ...optimalThinking,
      },
      // Enable grounding for information-seeking queries
      groundingConfig: {
        ...conversation.config?.groundingConfig,
        enabled: conversation.config?.groundingConfig?.enabled || 
          (content.toLowerCase().includes('latest') || 
           content.toLowerCase().includes('recent') || 
           content.toLowerCase().includes('current') ||
           content.toLowerCase().includes('news') ||
           content.toLowerCase().includes('today') ||
           content.toLowerCase().includes('2024') ||
           content.toLowerCase().includes('2025')),
      },
      // Auto-enable URL context when URLs are detected in the message
      urlContextConfig: {
        ...conversation.config?.urlContextConfig,
        enabled: conversation.config?.urlContextConfig?.enabled || 
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g.test(content),
        urls: extractUrlsFromMessage(content, conversation.config?.urlContextConfig?.maxUrls || 3),
      }
    };

    const updatedConversation = {
      ...conversation,
      messages: updatedMessages,
      title: conversation.messages.length === 0 ? content.slice(0, 50) : conversation.title,
      updatedAt: new Date(),
      config: enhancedConfig,
    };

    // First save user message to IndexedDB
    await saveConversation(updatedConversation);

    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const assistantMessageId = (Date.now() + 1).toString();
      let fullResponse = '';
      let groundingMetadata = null;
      let urlContextMetadata = null;
      let actualModelUsed = selectedModel; // Track the actual model used (may change due to switching)
      
      // Create placeholder assistant message
      const placeholderMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      // Add placeholder message immediately for streaming display
      const tempMessages = [...updatedMessages, placeholderMessage];
      const tempConversation = {
        ...updatedConversation,
        messages: tempMessages,
        updatedAt: new Date(),
      };

      // Save temporary conversation with placeholder
      await saveConversation(tempConversation);

      // Use enhanced streaming response with grounding support
      let optimizedMessages = updatedMessages;
      
      // Apply enhanced context optimization with model awareness
      if (contextManager.needsOptimization(updatedMessages)) {
        console.log('🧠 Applying enhanced context optimization...');
        optimizedMessages = contextManager.optimizeContext(updatedMessages, selectedModel);
        
        const summary = contextManager.createIntelligentSummary(
          updatedMessages.slice(0, updatedMessages.length - optimizedMessages.length)
        );
        
        if (summary) {
          console.log('📋 Enhanced context summary created:', summary.content.substring(0, 100) + '...');
        }
      }

      // Use grounding-enabled streaming if available and enabled
      const useGrounding = enhancedConfig.groundingConfig?.enabled && modelCapabilities.supportsGrounding;
      const useUrlContext = enhancedConfig.urlContextConfig?.enabled && modelCapabilities.supportsUrlContext;
      
      // Disable streaming for some models as they don't support it
      const useStreaming = enhancedConfig.streamingEnabled !== false;
      
      if (useStreaming) {
        setIsStreaming(true);
        
        // Special handling for URL context only (without grounding)
        if (useUrlContext && !useGrounding && enhancedConfig.urlContextConfig?.urls?.length) {
          console.log('🌐 Using URL context analysis with streaming');
          try {
            // For URL context, we use the analyzeUrls method instead of streaming
            const urlAnalysisResult = await geminiService.analyzeUrls(
              enhancedConfig.urlContextConfig.urls.filter(url => url.trim() !== ''),
              content,
              selectedModel
            );
            
            fullResponse = urlAnalysisResult.text;
            urlContextMetadata = urlAnalysisResult.urlContextMetadata;
            
            // Simulate streaming for consistent UX
            let currentIndex = 0;
            const streamingInterval = setInterval(() => {
              if (currentIndex < fullResponse.length) {
                const chunk = fullResponse.slice(0, currentIndex + 50);
                setStreamingMessage(chunk);
                currentIndex += 50;
              } else {
                clearInterval(streamingInterval);
              }
            }, 50);
            
          } catch (error) {
            console.error('URL context analysis failed:', error);
            // Fallback to regular streaming
            const stream = geminiService.generateStreamingResponseWithModelSwitch(
              optimizedMessages, 
              selectedModel,
              enhancedConfig
            );

            for await (const chunk of stream) {
              if (chunk.text) {
                fullResponse += chunk.text;
                setStreamingMessage(fullResponse);
              }
              if (chunk.modelSwitched && chunk.newModel) {
                actualModelUsed = chunk.newModel;
                setSelectedModel(chunk.newModel);
                toast.success(`🔄 ${chunk.switchReason}`, { duration: 8000, icon: '⚠️' });
              }
              if (chunk.groundingMetadata) groundingMetadata = chunk.groundingMetadata;
              if (chunk.urlContextMetadata) urlContextMetadata = chunk.urlContextMetadata;
            }
          }
        } else if (useGrounding || useUrlContext) {
          console.log('🔍 Using grounding-enabled streaming generation with model switching');
          const stream = geminiService.generateStreamingResponseWithGrounding(
            optimizedMessages, 
            selectedModel,
            enhancedConfig
          );

          for await (const chunk of stream) {
            if (chunk.text) {
              fullResponse += chunk.text;
              setStreamingMessage(fullResponse);
              // Don't update conversations during streaming - only update streamingMessage
            }
            
            // Capture grounding metadata
            if (chunk.groundingMetadata) {
              groundingMetadata = chunk.groundingMetadata;
            }
            
            if (chunk.urlContextMetadata) {
              urlContextMetadata = chunk.urlContextMetadata;
            }
          }
        } else {
          // Use intelligent streaming with model switching
          console.log('⚡ Using intelligent streaming generation with model switching');
          const stream = geminiService.generateStreamingResponseWithModelSwitch(
            optimizedMessages, 
            selectedModel,
            enhancedConfig
          );

          let actualModelUsed = selectedModel;
          for await (const chunk of stream) {
            if (chunk.text) {
              fullResponse += chunk.text;
              setStreamingMessage(fullResponse);
            }
            
            // Handle model switch notifications
            if (chunk.modelSwitched && chunk.newModel) {
              actualModelUsed = chunk.newModel;
              console.log(`🔄 Model switched during streaming: ${selectedModel} → ${chunk.newModel}`);
              
              // Update selected model for future messages
              setSelectedModel(chunk.newModel);
              
              // Show user notification about model switch
              toast.success(`🔄 ${chunk.switchReason}`, {
                duration: 8000,
                icon: '⚠️',
              });
            }
            
            // Capture grounding metadata
            if (chunk.groundingMetadata) {
              groundingMetadata = chunk.groundingMetadata;
            }
            
            if (chunk.urlContextMetadata) {
              urlContextMetadata = chunk.urlContextMetadata;
            }
          }
        }
      } else {
        // Non-streaming mode - get complete response at once
        console.log('🎯 Using intelligent non-streaming generation with model switching');
        
        let actualModelUsed = selectedModel;
        
        // Special handling for URL context only
        if (useUrlContext && !useGrounding && enhancedConfig.urlContextConfig?.urls?.length) {
          console.log('🌐 Using URL context analysis (non-streaming)');
          try {
            const urlAnalysisResult = await geminiService.analyzeUrls(
              enhancedConfig.urlContextConfig.urls.filter(url => url.trim() !== ''),
              content,
              selectedModel
            );
            fullResponse = urlAnalysisResult.text;
            urlContextMetadata = urlAnalysisResult.urlContextMetadata;
          } catch (error) {
            console.error('URL context analysis failed, falling back to regular generation:', error);
            // Fallback to regular generation
            const result = await geminiService.generateResponseWithModelSwitch(
              optimizedMessages,
              selectedModel,
              enhancedConfig
            );
            const response = result.response;
            actualModelUsed = result.modelUsed;
            
            if (result.modelSwitched) {
              setSelectedModel(actualModelUsed);
              toast.success(`🔄 ${result.switchReason}`, { duration: 8000, icon: '⚠️' });
            }
            
            if (typeof response === 'string') {
              fullResponse = response;
            } else {
              fullResponse = response.text || '';
              groundingMetadata = response.groundingMetadata;
              urlContextMetadata = response.urlContextMetadata;
            }
          }
        } else if (useGrounding) {
          const response = await geminiService.generateResponseWithGrounding(
            optimizedMessages,
            selectedModel,
            enhancedConfig
          );
          fullResponse = response.text;
          groundingMetadata = response.groundingMetadata;
          urlContextMetadata = response.urlContextMetadata;
        } else {
          // Use intelligent generation with model switching
          const result = await geminiService.generateResponseWithModelSwitch(
            optimizedMessages,
            selectedModel,
            enhancedConfig
          );
          
          const response = result.response;
          actualModelUsed = result.modelUsed;
          
          // Handle model switch for non-streaming
          if (result.modelSwitched && result.switchReason) {
            console.log(`🔄 Model switched during generation: ${selectedModel} → ${actualModelUsed}`);
            
            // Update selected model for future messages
            setSelectedModel(actualModelUsed);
            
            // Show user notification about model switch
            toast.success(`🔄 ${result.switchReason}`, {
              duration: 8000,
              icon: '⚠️',
            });
          }
          
          // Handle both string and GeminiResponse types
          if (typeof response === 'string') {
            fullResponse = response;
          } else {
            fullResponse = response.text || '';
            // Handle images if present
            if (response.images && response.images.length > 0) {
              const generatedImages: FileAttachment[] = [];
              response.images.forEach((imageData, index) => {
                const imageFile: FileAttachment = {
                  id: `generated-${Date.now()}-${index}`,
                  name: `generated_image_${index + 1}.png`,
                  type: 'image/png',
                  size: Math.round(imageData.length * 0.75),
                  url: `data:image/png;base64,${imageData}`,
                  data: `data:image/png;base64,${imageData}`,
                };
                generatedImages.push(imageFile);
              });
              
              // Update the final message to include images
              const imageMessage: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: fullResponse || `Generated ${response.images.length} image${response.images.length > 1 ? 's' : ''} using ${actualModelUsed}`,
                timestamp: new Date(),
                files: generatedImages,
                metadata: {
                  modelUsed: actualModelUsed,
                  thinkingEnabled: optimalThinking.enabled,
                  ...(response.groundingMetadata && { groundingMetadata: response.groundingMetadata }),
                  ...(response.urlContextMetadata && { urlContextMetadata: response.urlContextMetadata }),
                },
              };
              
              const finalMessagesWithImages = [...updatedMessages, imageMessage];
              const finalConversationWithImages = {
                ...updatedConversation,
                messages: finalMessagesWithImages,
                updatedAt: new Date(),
              };
              
              await saveConversation(finalConversationWithImages);
              
              return;
            }
            
            groundingMetadata = response.groundingMetadata;
            urlContextMetadata = response.urlContextMetadata;
          }
        }
        
        // No need to update conversations here - it will be done in the final update below
      }

      // Final update with complete message and metadata
      const finalMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        metadata: {
          modelUsed: actualModelUsed || selectedModel,
          thinkingEnabled: optimalThinking.enabled,
          ...(groundingMetadata && { groundingMetadata }),
          ...(urlContextMetadata && { urlContextMetadata }),
        },
      };

      const finalMessages = [...updatedMessages, finalMessage];
      const finalConversation = {
        ...updatedConversation,
        messages: finalMessages,
        updatedAt: new Date(),
      };

      console.log('✅ Final update with complete message');
      // Save final complete conversation to IndexedDB
      await saveConversation(finalConversation);

      // Show grounding info if available
      if (groundingMetadata?.webSearchQueries?.length > 0) {
        toast.success(`🔍 Found information from ${groundingMetadata.groundingChunks?.length || 0} sources`);
      }
      
      // Show URL context info if available
      if (urlContextMetadata?.urlMetadata?.length > 0) {
        const successfulUrls = urlContextMetadata.urlMetadata.filter(url => 
          url.urlRetrievalStatus === 'URL_RETRIEVAL_STATUS_SUCCESS'
        ).length;
        if (successfulUrls > 0) {
          toast.success(`🌐 Successfully analyzed ${successfulUrls} URL${successfulUrls > 1 ? 's' : ''}`);
        } else {
          toast.warning(`⚠️ Could not access some URLs - check if they are publicly available`);
        }
      }
    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Failed to generate response. Please try again.');
      
      // Remove placeholder message on error - resave conversation without empty messages
      try {
        const errorConversation = {
          ...conversation,
          messages: conversation.messages.filter(msg => msg.content !== ''),
          updatedAt: new Date(),
        };
        await saveConversation(errorConversation);
      } catch (saveErr) {
        console.error('Failed to save conversation after error:', saveErr);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
    }
  }, [apiKeys, currentConversation, createNewConversation, selectedModel, saveConversation, contextManager]);


  const deleteConversation = useCallback((conversationId: string) => {
    dbDeleteConversation(conversationId);
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }
  }, [dbDeleteConversation, currentConversationId, setCurrentConversationId]);

  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, [setCurrentConversationId]);

  const exportConversation = useCallback((conversationId: string, format: 'txt' | 'html' | 'pdf' = 'txt') => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      toast.error('Conversation not found');
      return;
    }

    // Create safe filename that preserves Chinese characters
    const safeFilename = conversation.title
      .replace(/[<>:"/\\|?*]/g, '_') // Only replace problematic filesystem characters
      .normalize('NFC') // Normalize Unicode
      .trim();
    
    const dateStr = new Date().toISOString().split('T')[0];
    const baseFilename = `${safeFilename}_${dateStr}`;

    if (format === 'txt') {
      // Create formatted export content for TXT
      const exportContent = conversation.messages.map(message => {
        const timestamp = new Date(message.timestamp).toLocaleString();
        const role = message.role === 'user' ? 'User' : 'Assistant';
        return `[${timestamp}] ${role}:\n${message.content}\n`;
      }).join('\n---\n\n');
      
      const fullContent = `Conversation: ${conversation.title}\nCreated: ${new Date(conversation.createdAt).toLocaleString()}\nUpdated: ${new Date(conversation.updatedAt).toLocaleString()}\nModel: ${conversation.model}\n\n${exportContent}`;
      
      // Create and download file
      const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFilename}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Conversation exported as TXT successfully');
    } else if (format === 'html') {
      // Create HTML export using advanced renderer that supports Mermaid, KaTeX, and code highlighting
      const htmlContent = generateAdvancedHTMLExport(conversation);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFilename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Conversation exported as HTML successfully');
    } else if (format === 'pdf') {
      // Create PDF export using the advanced HTML renderer
      const htmlContent = generateAdvancedHTMLExport(conversation);
      generatePDFExport(conversation, baseFilename, htmlContent);
    }
  }, [conversations]);

  const updateConversationConfig = useCallback(async (conversationId: string, config: ConversationConfig) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      const updatedConversation = {
        ...conversation,
        config,
        updatedAt: new Date()
      };
      await saveConversation(updatedConversation);
    }
  }, [conversations, saveConversation]);

  const stopGeneration = useCallback(() => {
    geminiService.stopGeneration();
    setIsStreaming(false);
    setIsLoading(false);
    toast.info('Generation stopped');
  }, []);

  const updateContextConfig = useCallback((newConfig: Partial<ContextConfig>) => {
    const updatedConfig = { ...contextConfig, ...newConfig };
    setContextConfig(updatedConfig);
    contextManager.updateConfig(newConfig);
    toast.success('Context management settings updated');
  }, [contextConfig, contextManager, setContextConfig]);

  const getContextInfo = useCallback(() => {
    if (!currentConversation) {
      return null;
    }
    
    const messages = currentConversation.messages;
    const estimatedTokens = contextManager.estimateTokens(messages);
    const needsOptimization = contextManager.needsOptimization(messages);
    
    return {
      messageCount: messages.length,
      estimatedTokens,
      needsOptimization,
      maxHistoryLength: contextConfig.maxHistoryLength,
      maxTokens: contextConfig.maxTokens,
    };
  }, [currentConversation, contextManager, contextConfig]);

  const getPerformanceMetrics = useCallback(() => {
    return geminiService.getStats();
  }, []);

  return {
    conversations,
    currentConversation,
    isLoading: isLoading || conversationsLoading,
    isStreaming,
    streamingMessage,
    apiKeys,
    setApiKeys,
    selectedModel,
    setSelectedModel,
    sendMessage,
    stopGeneration,
    createNewConversation,
    deleteConversation,
    selectConversation,
    exportConversation,
    // New configuration functions
    defaultConversationConfig,
    setDefaultConversationConfig,
    updateConversationConfig,
    getPerformanceMetrics,
    // Context management
    contextConfig,
    updateContextConfig,
    getContextInfo,
    // Data management
    cleanupOldConversations,
    getStorageUsage,
    // Error state
    error: conversationsError,
  };
}