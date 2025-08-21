import React from 'react';
import { ModernMarkdownRenderer } from './ModernMarkdownRenderer';
import { RenderingErrorBoundary } from './RenderingErrorBoundary';
import type { Message } from '../types/chat';

interface ExportRendererProps {
  messages: Message[];
  title?: string;
  includeMetadata?: boolean;
  enableExport?: boolean;
}

export function ExportRenderer({ 
  messages, 
  title, 
  includeMetadata = true,
  enableExport = false 
}: ExportRendererProps) {
  
  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="export-container max-w-4xl mx-auto p-8 bg-white">
      {/* Header */}
      {title && (
        <div className="mb-8 border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          {includeMetadata && (
            <p className="text-sm text-gray-600">
              Export time: {formatTimestamp(new Date())} | {messages.length} messages total
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-8">
        {messages.map((message, index) => (
          <div key={`${message.id}-${index}`} className="message-item">
            {/* Message Header */}
            {includeMetadata && (
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    message.role === 'user' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.role === 'user' ? 'User' : 'AI Assistant'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
            )}

            {/* Files */}
            {message.files && message.files.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h4>
                <div className="space-y-2">
                  {message.files.map((file) => (
                    <div key={file.id} className="flex items-center space-x-2">
                      {file.type.startsWith('image/') ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">{file.name}</p>
                          <img
                            src={file.url}
                            alt={file.name}
                            className="max-w-md rounded-lg border border-gray-200"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          📄 {file.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Content */}
            <div className="message-content">
              {message.role === 'user' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="whitespace-pre-wrap text-gray-900">
                    {message.content}
                  </div>
                </div>
              ) : (
                <RenderingErrorBoundary>
                  <ModernMarkdownRenderer 
                    content={message.content}
                    enableCopy={false}
                    enableExport={enableExport}
                    className="prose-export"
                  />
                </RenderingErrorBoundary>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {includeMetadata && (
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            This conversation record was exported by Gemini App | Export time: {formatTimestamp(new Date())}
          </p>
        </div>
      )}

      {/* Export-specific styles */}
      <style jsx>{`
        @media print {
          .export-container {
            max-width: none;
            margin: 0;
            padding: 20px;
          }
          
          .message-item {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          
          /* Ensure proper rendering of math and diagrams */
          .katex-display {
            margin: 1em 0;
          }
          
          .mermaid-diagram {
            max-width: 100%;
            height: auto;
          }
        }
        
        /* Export-specific prose styling */
        .prose-export {
          color: #111827;
        }
        
        .prose-export h1,
        .prose-export h2,
        .prose-export h3,
        .prose-export h4,
        .prose-export h5,
        .prose-export h6 {
          color: #111827;
          font-weight: 600;
        }
        
        .prose-export code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        
        .prose-export pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        
        .prose-export blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          background-color: #eff6ff;
          color: #374151;
          font-style: italic;
        }
        
        .prose-export table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .prose-export th,
        .prose-export td {
          border: 1px solid #d1d5db;
          padding: 0.5rem;
          text-align: left;
        }
        
        .prose-export th {
          background-color: #f9fafb;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}