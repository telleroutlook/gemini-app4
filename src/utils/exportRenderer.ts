import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Conversation, Message } from '../types/chat';
import { fixMermaidSyntax } from './contentParser';

// Server-side safe Markdown renderer for export
function ExportMarkdownRenderer({ content }: { content: string }) {
  // Simple but effective content processing that mirrors ModernMarkdownRenderer logic
  const processContent = (text: string) => {
    // 增强的内容处理逻辑，采用主程序的保护机制
    
    // 1. 首先保护所有代码块，避免处理其中的特殊字符
    const codeBlocks: string[] = [];
    let processed = text.replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    
    // 2. 保护内联代码
    const inlineCodes: string[] = [];
    processed = processed.replace(/`[^`]*?`/g, (match) => {
      inlineCodes.push(match);
      return `__INLINE_CODE_${inlineCodes.length - 1}__`;
    });

    // 3. 智能数学公式处理 - 使用占位符机制避免冲突
    const mathBlockPlaceholders: string[] = [];
    
    // 先处理块级数学公式
    processed = processed.replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, (match, content) => {
      const placeholder = `__MATH_BLOCK_${mathBlockPlaceholders.length}__`;
      mathBlockPlaceholders.push(`<div class="math-block">$$${content.trim()}$$</div>`);
      return placeholder;
    });
    
    // 处理内联数学公式
    processed = processed.replace(/\$([^$\n]+)\$/g, (match, content) => {
      return `<span class="math-inline">$${content}$</span>`;
    });
    
    // 修复中文和数学公式混合的问题（从主程序学习）
    processed = processed.replace(
      /([\u4e00-\u9fff\s]+)->\s*\$\s*([^$]+)\s*\$/g,
      '$1-> `$2`'
    );
    
    // 处理 ```math 块
    processed = processed.replace(/```math\n([\s\S]*?)\n```/g, (match, content) => {
      const placeholder = `__MATH_BLOCK_${mathBlockPlaceholders.length}__`;
      mathBlockPlaceholders.push(`<div class="math-block">$$${content.trim()}$$</div>`);
      return placeholder;
    });

    // 4. 处理Mermaid图表（已经恢复代码块，所以Mermaid会被正确处理）
    // 恢复代码块进行Mermaid处理
    codeBlocks.forEach((code, index) => {
      processed = processed.replace(`__CODE_BLOCK_${index}__`, code);
    });

    // Handle Mermaid diagrams - convert to placeholder that will be replaced
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    processed = processed.replace(mermaidRegex, (match, code) => {
      // Basic validation to avoid rendering invalid diagrams
      const trimmedCode = code.trim();
      if (!trimmedCode || 
          (trimmedCode.includes('title:') && trimmedCode.includes('column_') && trimmedCode.includes('row_'))) {
        // Skip invalid or table-like structures
        return `<div class="invalid-diagram">Invalid diagram format (possibly a table): <pre>${escapeHtml(trimmedCode)}</pre></div>`;
      }
      
      // Apply Mermaid syntax fixes using the same logic as the main app
      const fixedCode = fixMermaidSyntax(trimmedCode);
      
      // Check if the fixed code indicates an unsupported format
      if (!fixedCode || fixedCode === 'UNSUPPORTED_TABLE_SYNTAX') {
        return `<div class="invalid-diagram">不支持的图表格式: <pre>${escapeHtml(trimmedCode)}</pre></div>`;
      }
      
      return `<div class="mermaid-diagram" data-diagram="${encodeURIComponent(fixedCode)}">${escapeHtml(fixedCode)}</div>`;
    });

    // Handle other code blocks with syntax highlighting placeholder
    processed = processed.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
      const language = lang || 'text';
      const lineCount = code.trim().split('\n').length;
      const shouldShowLineNumbers = lineCount > 5;
      
      return `<pre class="code-block" data-language="${language}" data-line-numbers="${shouldShowLineNumbers}"><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // 5. 恢复数学公式占位符
    mathBlockPlaceholders.forEach((html, index) => {
      processed = processed.replace(`__MATH_BLOCK_${index}__`, html);
    });
    
    // 6. 恢复内联代码
    inlineCodes.forEach((code, index) => {
      processed = processed.replace(`__INLINE_CODE_${index}__`, '<code class="inline-code">' + escapeHtml(code.slice(1, -1)) + '</code>');
    });

    // 7. 处理markdown表格（在其他格式化之前）
    processed = parseMarkdownTables(processed);

    // 8. 处理基本markdown格式
    processed = processed
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return processed;
  };

  const processedContent = processContent(content);
  
  return React.createElement('div', {
    className: 'message-content',
    dangerouslySetInnerHTML: { __html: `<p>${processedContent}</p>` }
  });
}

// Message component for export
function ExportMessage({ message }: { message: Message }) {
  const timestamp = new Date(message.timestamp).toLocaleString();
  const role = message.role === 'user' ? 'User' : 'Assistant';
  const roleClass = message.role === 'user' ? 'user-message' : 'assistant-message';

  return React.createElement('div', {
    className: `message ${roleClass}`,
    children: [
      React.createElement('div', {
        key: 'header',
        className: 'message-header',
        children: [
          React.createElement('span', { key: 'role', className: 'role' }, role),
          React.createElement('span', { key: 'timestamp', className: 'timestamp' }, timestamp)
        ]
      }),
      React.createElement(ExportMarkdownRenderer, {
        key: 'content',
        content: message.content
      })
    ]
  });
}

// Main export document component
function ExportDocument({ conversation }: { conversation: Conversation }) {
  return React.createElement('html', {
    lang: 'zh-CN',
    children: [
      React.createElement('head', {
        key: 'head',
        children: [
          React.createElement('meta', { key: 'charset', charSet: 'UTF-8' }),
          React.createElement('meta', { 
            key: 'viewport', 
            name: 'viewport', 
            content: 'width=device-width, initial-scale=1.0' 
          }),
          React.createElement('title', { key: 'title' }, conversation.title),
          React.createElement('script', {
            key: 'mermaid',
            src: 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
          }),
          React.createElement('script', {
            key: 'katex',
            src: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js'
          }),
          React.createElement('link', {
            key: 'katex-css',
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
          }),
          React.createElement('script', {
            key: 'prism',
            src: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js'
          }),
          React.createElement('script', {
            key: 'prism-autoloader',
            src: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js'
          }),
          React.createElement('script', {
            key: 'prism-line-numbers',
            src: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/line-numbers/prism-line-numbers.min.js'
          }),
          React.createElement('link', {
            key: 'prism-css',
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css'
          }),
          React.createElement('link', {
            key: 'prism-line-numbers-css',
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/line-numbers/prism-line-numbers.css'
          }),
          React.createElement('style', {
            key: 'styles',
            dangerouslySetInnerHTML: { __html: getExportStyles() }
          })
        ]
      }),
      React.createElement('body', {
        key: 'body',
        children: [
          React.createElement('div', {
            key: 'header',
            className: 'header',
            children: [
              React.createElement('h1', { key: 'title' }, conversation.title),
              React.createElement('div', {
                key: 'meta',
                className: 'meta',
                children: [
                  React.createElement('div', { key: 'created' }, `Created: ${new Date(conversation.createdAt).toLocaleString()}`),
                  React.createElement('div', { key: 'updated' }, `Updated: ${new Date(conversation.updatedAt).toLocaleString()}`),
                  React.createElement('div', { key: 'model' }, `Model: ${conversation.model}`)
                ]
              })
            ]
          }),
          React.createElement('div', {
            key: 'conversation',
            className: 'conversation',
            children: conversation.messages.map((message, index) =>
              React.createElement(ExportMessage, { key: index, message })
            )
          }),
          React.createElement('script', {
            key: 'init-script',
            dangerouslySetInnerHTML: { __html: getInitScript() }
          })
        ]
      })
    ]
  });
}

function parseMarkdownTables(content: string): string {
  // Better regex to match complete markdown tables
  const tableRegex = /(\|[^\r\n]*\|[\r\n]+\|[-\s:|]*\|[\r\n]+((\|[^\r\n]*\|[\r\n]*)+))/g;
  
  return content.replace(tableRegex, (match) => {
    const lines = match.trim().split(/[\r\n]+/).filter(line => line.trim() && line.includes('|'));
    
    if (lines.length < 3) return match; // Need at least header, separator, and one data row
    
    const headerLine = lines[0];
    const separatorLine = lines[1];
    const dataLines = lines.slice(2);
    
    // Parse header
    const headers = headerLine.split('|')
      .slice(1, -1) // Remove first and last empty elements
      .map(cell => cell.trim())
      .filter(cell => cell);
    
    if (headers.length === 0) return match;
    
    // Parse alignment from separator line
    const alignments = separatorLine.split('|')
      .slice(1, -1)
      .map(cell => {
        const trimmed = cell.trim();
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
        if (trimmed.endsWith(':')) return 'right';
        return 'left';
      });
    
    // Parse data rows
    const rows = dataLines.map(line => {
      return line.split('|')
        .slice(1, -1) // Remove first and last empty elements
        .map(cell => cell.trim());
    }).filter(row => row.length > 0);
    
    // Generate HTML table with wrapper
    let tableHtml = '<div class="table-wrapper"><table class="markdown-table">';
    
    // Header
    tableHtml += '<thead><tr>';
    headers.forEach((header, index) => {
      const align = alignments[index] || 'left';
      tableHtml += `<th style="text-align: ${align}">${escapeHtml(header)}</th>`;
    });
    tableHtml += '</tr></thead>';
    
    // Body
    if (rows.length > 0) {
      tableHtml += '<tbody>';
      rows.forEach(row => {
        tableHtml += '<tr>';
        headers.forEach((_, index) => {
          const cell = row[index] || '';
          const align = alignments[index] || 'left';
          tableHtml += `<td style="text-align: ${align}">${escapeHtml(cell)}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody>';
    }
    
    tableHtml += '</table></div>';
    return tableHtml;
  });
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getExportStyles(): string {
  return `
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
    .inline-code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9em;
    }
    .code-block {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
    }
    .code-block code {
      background: none;
      padding: 0;
      color: inherit;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }
    .mermaid-diagram {
      margin: 20px 0;
      padding: 20px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      text-align: center;
    }
    .invalid-diagram {
      margin: 20px 0;
      padding: 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
    }
    .invalid-diagram pre {
      background: #fee2e2;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      overflow-x: auto;
    }
    .math-block {
      margin: 16px 0;
      text-align: center;
      font-size: 1.1em;
      overflow-x: auto;
      max-width: 100%;
    }
    .math-block .katex-display {
      margin: 0;
      overflow-x: auto;
      max-width: 100%;
    }
    .math-inline {
      font-size: 1em;
      max-width: 100%;
      display: inline-block;
      overflow-x: auto;
    }
    .math-inline .katex {
      max-width: 100%;
      overflow-x: auto;
    }
    strong {
      font-weight: 600;
      color: #111827;
    }
    em {
      font-style: italic;
      color: #374151;
    }
    .table-wrapper {
      overflow-x: auto;
      margin: 16px 0;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    table, .markdown-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 0.9em;
      min-width: 500px;
    }
    td, th {
      border: 1px solid #e5e7eb;
      padding: 12px 16px;
      text-align: left;
      vertical-align: top;
      line-height: 1.5;
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
      position: sticky;
      top: 0;
    }
    .markdown-table tbody tr:nth-child(even) {
      background-color: #fafafa;
    }
    .markdown-table tbody tr:hover {
      background-color: #f0f9ff;
    }
    .markdown-table tbody tr {
      transition: background-color 0.15s ease;
    }
    .markdown-table td:first-child,
    .markdown-table th:first-child {
      border-left: none;
    }
    .markdown-table td:last-child,
    .markdown-table th:last-child {
      border-right: none;
    }
    .markdown-table tbody tr:last-child td {
      border-bottom: none;
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
  `;
}

function getInitScript(): string {
  return `
    // Initialize Mermaid diagrams, KaTeX math, and Prism syntax highlighting
    document.addEventListener('DOMContentLoaded', function() {
      // Configure Mermaid
      if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: '"Inter", "Noto Sans CJK SC", "Microsoft YaHei", "SimHei", system-ui, sans-serif',
          useMaxWidth: true,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            padding: 20
          },
          sequence: {
            useMaxWidth: true,
            diagramMarginX: 20,
            diagramMarginY: 10
          },
          gantt: {
            useMaxWidth: true
          }
        });

        // Render Mermaid diagrams
        const diagrams = document.querySelectorAll('.mermaid-diagram');
        diagrams.forEach(async (element, index) => {
          try {
            const codeAttr = element.getAttribute('data-diagram');
            if (!codeAttr) {
              throw new Error('No diagram data found');
            }
            
            const code = decodeURIComponent(codeAttr);
            
            // The code has already been processed by fixMermaidSyntax on the server side
            const processedCode = code.trim();
            
            // Basic validation
            if (!processedCode) {
              throw new Error('No diagram content found');
            }
            
            await mermaid.parse(processedCode);
            const elementId = 'mermaid-export-' + index + '-' + Math.random().toString(36).substr(2, 9);
            const renderResult = await mermaid.render(elementId, processedCode);
            
            if (renderResult && renderResult.svg) {
              element.innerHTML = renderResult.svg;
              element.style.textAlign = 'center';
              element.style.padding = '20px';
            } else {
              throw new Error('渲染失败：未返回SVG内容');
            }
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            const errorMessage = error.message || 'Unknown error';
            let userFriendlyError = '';
            
            if (errorMessage.includes('Parse error') || errorMessage.includes('Syntax validation failed')) {
              userFriendlyError = '语法解析错误 - 可能是中文字符导致，请检查边缘标签是否用引号包围';
            } else if (errorMessage.includes('Lexical error')) {
              userFriendlyError = '词法错误 - 可能是注释格式错误';
            } else if (errorMessage.includes('Unsupported table syntax')) {
              userFriendlyError = '不支持的表格语法 - 请使用正确的Mermaid表格格式';
            } else {
              userFriendlyError = '图表渲染失败: ' + errorMessage;
            }
            
            element.innerHTML = '<div style="color: #dc2626; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">' + 
                               '<strong>图表渲染失败</strong><br>' + userFriendlyError + 
                               '<details style="margin-top: 10px;"><summary style="cursor: pointer;">查看原始代码</summary>' +
                               '<pre style="background: #fee2e2; padding: 10px; border-radius: 4px; margin-top: 10px; overflow-x: auto;">' + 
                               element.textContent + '</pre></details></div>';
          }
        });
      }

      // Initialize KaTeX math rendering with improved error handling (Context7 best practices)
      if (typeof katex !== 'undefined') {
        // Block math expressions
        const mathBlocks = document.querySelectorAll('.math-block');
        mathBlocks.forEach(block => {
          try {
            const math = block.textContent.replace(/^\\$+|\\$+$/g, '').trim();
            if (math) {
              katex.render(math, block, { 
                displayMode: true,
                throwOnError: false,
                errorColor: '#dc2626',
                strict: 'warn',
                output: 'htmlAndMathml',
                fleqn: false,
                macros: {},
                maxSize: Infinity,
                maxExpand: 1000,
                trust: false
              });
            }
          } catch (error) {
            console.error('KaTeX block rendering error:', error);
            block.innerHTML = '<div style="color: #dc2626; background: #fef2f2; padding: 8px; border-radius: 4px; border: 1px solid #fecaca;">' +
                             '<strong>数学公式渲染失败</strong><br>' + 
                             '<small>' + (error.message || 'Unknown error') + '</small></div>';
          }
        });

        // Inline math expressions
        const mathInlines = document.querySelectorAll('.math-inline');
        mathInlines.forEach(inline => {
          try {
            const math = inline.textContent.replace(/^\\$+|\\$+$/g, '').trim();
            if (math) {
              katex.render(math, inline, { 
                displayMode: false,
                throwOnError: false,
                errorColor: '#dc2626',
                strict: 'warn',
                output: 'htmlAndMathml',
                macros: {},
                maxSize: Infinity,
                maxExpand: 1000,
                trust: false
              });
            }
          } catch (error) {
            console.error('KaTeX inline rendering error:', error);
            inline.innerHTML = '<span style="color: #dc2626; background: #fef2f2; padding: 2px 4px; border-radius: 2px; font-size: 0.875rem;">公式错误</span>';
          }
        });
      }

      // Initialize Prism syntax highlighting with line numbers support
      if (typeof Prism !== 'undefined') {
        // Load additional language components if needed
        if (typeof Prism.plugins !== 'undefined' && Prism.plugins.autoloader) {
          Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
        }
        
        // Add line numbers to eligible code blocks
        const codeBlocks = document.querySelectorAll('.code-block[data-line-numbers="true"]');
        codeBlocks.forEach(block => {
          if (!block.classList.contains('line-numbers')) {
            block.classList.add('line-numbers');
          }
        });
        
        Prism.highlightAll();
      }
      
      console.log('Export rendering initialized successfully');
    });
  `;
}

// Enhanced export function that renders React components to static HTML
export function generateAdvancedHTMLExport(conversation: Conversation): string {
  try {
    const documentElement = React.createElement(ExportDocument, { conversation });
    const htmlString = renderToStaticMarkup(documentElement);
    return '<!DOCTYPE html>' + htmlString;
  } catch (error) {
    console.error('Export rendering error:', error);
    // Fallback to simple export
    return generateSimpleHTMLExport(conversation);
  }
}

// Fallback simple export function
function generateSimpleHTMLExport(conversation: Conversation): string {
  const htmlContent = conversation.messages.map(message => {
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
          <p>${escapeHtml(message.content).replace(/\n/g, '<br>')}</p>
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
    <style>${getExportStyles()}</style>
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