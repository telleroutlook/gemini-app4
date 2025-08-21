import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../utils/cn';

interface CodeBlockCopyProps {
  code: string;
  language: string;
  isMobile?: boolean;
}

export function CodeBlockCopy({ code, language, isMobile = false }: CodeBlockCopyProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`已复制 ${language} 代码到剪贴板`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('复制失败，请重试');
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className={cn(
        "absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-all z-10",
        "active:scale-95 touch-manipulation",
        "flex items-center space-x-1",
        isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}
      title={`复制 ${language} 代码`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
          {!isMobile && <span className="text-xs">已复制</span>}
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
          {!isMobile && <span className="text-xs">复制</span>}
        </>
      )}
    </button>
  );
}