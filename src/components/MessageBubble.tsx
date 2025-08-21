import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, User, Bot, Image, File, Download, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Message } from '../types/chat';
import { cn } from '../utils/cn';
import 'katex/dist/katex.min.css';

interface MessageBubbleProps {
  message: Message;
  isMobile?: boolean;
}

// File extension mapping
const getFileExtension = (language: string): string => {
  const extensionMap: { [key: string]: string } = {
    javascript: 'js',
    typescript: 'ts',
    jsx: 'jsx',
    tsx: 'tsx',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    php: 'php',
    ruby: 'rb',
    go: 'go',
    rust: 'rs',
    swift: 'swift',
    kotlin: 'kt',
    scala: 'scala',
    dart: 'dart',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sql: 'sql',
    json: 'json',
    xml: 'xml',
    yaml: 'yml',
    markdown: 'md',
    bash: 'sh',
    shell: 'sh',
    powershell: 'ps1',
    dockerfile: 'dockerfile',
    r: 'r',
    matlab: 'm',
    perl: 'pl',
    lua: 'lua',
    haskell: 'hs',
    clojure: 'clj',
    elm: 'elm',
    erlang: 'erl',
    elixir: 'ex',
    fsharp: 'fs',
    groovy: 'groovy',
    vim: 'vim',
    makefile: 'makefile',
    cmake: 'cmake',
    nginx: 'conf',
    apache: 'conf',
    ini: 'ini',
    toml: 'toml',
    diff: 'diff',
    patch: 'patch'
  };
  return extensionMap[language.toLowerCase()] || 'txt';
};

// Code block copy and export component
function CodeBlockCopy({ code, language, isMobile = false }: { code: string; language: string; isMobile?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Debug log
  React.useEffect(() => {
    console.log('CodeBlockCopy rendered for language:', language);
  }, [language]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Copied ${language} code to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const exportCode = () => {
    try {
      const extension = getFileExtension(language);
      const fileName = `code.${extension}`;
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, fileName);
      toast.success(`Exported ${language} code as ${fileName}`);
    } catch (error) {
      toast.error('Failed to export code');
    }
  };

  return (
    <div className="relative group">
      <div className={cn(
        "absolute top-2 right-2 flex gap-1 z-50",
        "opacity-100"
      )}>
        <button
          onClick={copyToClipboard}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-all active:scale-95 touch-manipulation min-h-0 min-w-0"
          title={`Copy ${language} code`}
        >
          {copied ? (
            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
        </button>
        <button
          onClick={exportCode}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-all active:scale-95 touch-manipulation min-h-0 min-w-0"
          title={`Export ${language} code as ${getFileExtension(language)} file`}
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
}

// Table operations component
function TableActions({ tableRef, isMobile = false }: { tableRef: React.RefObject<HTMLTableElement>; isMobile?: boolean }) {
  const [copied, setCopied] = useState(false);

  // Debug log
  React.useEffect(() => {
    console.log('TableActions rendered');
  }, []);

  const copyTableToClipboard = async () => {
    try {
      const tableElement = tableRef.current;
      if (!tableElement) return;
      
      // Extract table data as plain text
      const rows = Array.from(tableElement.rows);
      const tableText = rows.map(row => 
        Array.from(row.cells).map(cell => cell.textContent || '').join('\t')
      ).join('\n');
      
      await navigator.clipboard.writeText(tableText);
      setCopied(true);
      toast.success('Table copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy table');
    }
  };

  const exportTableAsCSV = () => {
    try {
      const tableElement = tableRef.current;
      if (!tableElement) return;
      
      const rows = Array.from(tableElement.rows);
      const csvData = rows.map(row => 
        Array.from(row.cells).map(cell => {
          const text = cell.textContent || '';
          // If contains comma, quotes or newlines, wrap in quotes and escape
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return '"' + text.replace(/"/g, '""') + '"';
          }
          return text;
        }).join(',')
      ).join('\n');
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'table.csv');
      toast.success('Table exported as CSV');
    } catch (error) {
      toast.error('Failed to export table as CSV');
    }
  };

  const exportTableAsXLSX = () => {
    try {
      const tableElement = tableRef.current;
      if (!tableElement) return;
      
      // Use SheetJS to convert HTML table to workbook
      const wb = XLSX.utils.table_to_book(tableElement, { sheet: "Sheet1" });
      
      // Export as XLSX file
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'table.xlsx');
      toast.success('Table exported as XLSX');
    } catch (error) {
      toast.error('Failed to export table as XLSX');
    }
  };

  return (
    <div className={cn(
      "flex gap-1 mt-2 transition-opacity z-50",
      "opacity-100"
    )}>
      <button
        onClick={copyTableToClipboard}
        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 hover:text-gray-900 transition-all active:scale-95 touch-manipulation min-h-0 min-w-0"
        title="Copy table to clipboard"
      >
        {copied ? (
          <><Check className="h-3 w-3 inline mr-1" />Copied</>
        ) : (
          <><Copy className="h-3 w-3 inline mr-1" />Copy</>
        )}
      </button>
      <button
        onClick={exportTableAsCSV}
        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded text-blue-700 hover:text-blue-900 transition-all active:scale-95 touch-manipulation min-h-0 min-w-0"
        title="Export table as CSV"
      >
        <FileText className="h-3 w-3 inline mr-1" />CSV
      </button>
      <button
        onClick={exportTableAsXLSX}
        className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded text-green-700 hover:text-green-900 transition-all active:scale-95 touch-manipulation min-h-0 min-w-0"
        title="Export table as XLSX"
      >
        <Download className="h-3 w-3 inline mr-1" />XLSX
      </button>
    </div>
  );
}

export function MessageBubble({ message, isMobile = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Copied message to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUser = message.role === 'user';

  return (
    <div className={cn(
      'flex w-full mb-4 sm:mb-6',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'flex space-x-2 sm:space-x-3',
        isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row',
        isMobile ? 'max-w-[95%]' : 'max-w-[80%]'
      )}>
        {/* Avatar */}
        <div className={cn(
          'flex-shrink-0 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-600' : 'bg-gray-600',
          isMobile ? 'w-7 h-7' : 'w-8 h-8'
        )}>
          {isUser ? (
            <User className={cn("text-white", isMobile ? "h-3 w-3" : "h-4 w-4")} />
          ) : (
            <Bot className={cn("text-white", isMobile ? "h-3 w-3" : "h-4 w-4")} />
          )}
        </div>

        {/* Message Content */}
        <div className={cn(
          'flex flex-col min-w-0',
          isUser ? 'items-end' : 'items-start'
        )}>
          <div className={cn(
            'rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200'
          )}>
            {/* Files */}
            {message.files && message.files.length > 0 && (
              <div className="mb-2 sm:mb-3 space-y-2">
                {message.files.map((file) => (
                  <div key={file.id} className="flex items-center space-x-2">
                    {file.type.startsWith('image/') ? (
                      <>
                        <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                        <img
                          src={file.url}
                          alt={file.name}
                          className={cn(
                            "rounded-lg object-cover",
                            isMobile ? "max-w-32 max-h-32" : "max-w-48 max-h-48"
                          )}
                        />
                      </>
                    ) : (
                      <>
                        <File className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">{file.name}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Text Content */}
            {isUser ? (
              <div className="whitespace-pre-wrap text-white text-sm sm:text-base">
                {message.content}
              </div>
            ) : (
              <div className="prose prose-sm sm:prose-base max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { output: 'html' }]]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      
                      return !inline && match ? (
                        <div className="relative group">
                          <CodeBlockCopy code={codeString} language={match[1]} isMobile={isMobile} />
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: '0.5rem',
                              fontSize: isMobile ? '12px' : '14px',
                            }}
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children, ...props }) {
                      const [tableRef] = React.useState(() => React.createRef<HTMLTableElement>());
                      
                      return (
                        <div className="relative group">
                          <table ref={tableRef} className="border-collapse border border-gray-300" {...props}>
                            {children}
                          </table>
                          <TableActions tableRef={tableRef} isMobile={isMobile} />
                        </div>
                      );
                    },
                    th({ children, ...props }) {
                      return (
                        <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold" {...props}>
                          {children}
                        </th>
                      );
                    },
                    td({ children, ...props }) {
                      return (
                        <td className="border border-gray-300 px-2 py-1" {...props}>
                          {children}
                        </td>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Message Actions */}
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            {!isUser && (
              <button
                onClick={copyToClipboard}
                className={cn(
                  "p-1 text-gray-400 hover:text-gray-600 transition-colors",
                  "active:scale-95 touch-manipulation"
                )}
                title="Copy entire message"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}