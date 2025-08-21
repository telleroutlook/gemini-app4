import React, { useCallback, useState } from 'react';
import { 
  Upload, X, File, Image, Video, FileText, Music, Archive, 
  Code, Presentation, Table, AlertCircle 
} from 'lucide-react';
import type { FileAttachment } from '../types/chat';
import { cn } from '../utils/cn';

interface FileUploadProps {
  files: FileAttachment[];
  onFilesChange: (files: FileAttachment[]) => void;
  className?: string;
  isMobile?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

const SUPPORTED_FILE_TYPES = {
  // Images
  'image/jpeg': { icon: Image, color: 'text-blue-500', category: 'Image' },
  'image/jpg': { icon: Image, color: 'text-blue-500', category: 'Image' },
  'image/png': { icon: Image, color: 'text-blue-500', category: 'Image' },
  'image/gif': { icon: Image, color: 'text-blue-500', category: 'Image' },
  'image/webp': { icon: Image, color: 'text-blue-500', category: 'Image' },
  'image/bmp': { icon: Image, color: 'text-blue-500', category: 'Image' },
  'image/svg+xml': { icon: Image, color: 'text-blue-500', category: 'Image' },
  
  // Videos
  'video/mp4': { icon: Video, color: 'text-purple-500', category: 'Video' },
  'video/avi': { icon: Video, color: 'text-purple-500', category: 'Video' },
  'video/mov': { icon: Video, color: 'text-purple-500', category: 'Video' },
  'video/wmv': { icon: Video, color: 'text-purple-500', category: 'Video' },
  'video/flv': { icon: Video, color: 'text-purple-500', category: 'Video' },
  'video/webm': { icon: Video, color: 'text-purple-500', category: 'Video' },
  'video/mkv': { icon: Video, color: 'text-purple-500', category: 'Video' },
  
  // Audio
  'audio/mp3': { icon: Music, color: 'text-green-500', category: 'Audio' },
  'audio/wav': { icon: Music, color: 'text-green-500', category: 'Audio' },
  'audio/m4a': { icon: Music, color: 'text-green-500', category: 'Audio' },
  'audio/aac': { icon: Music, color: 'text-green-500', category: 'Audio' },
  'audio/ogg': { icon: Music, color: 'text-green-500', category: 'Audio' },
  'audio/flac': { icon: Music, color: 'text-green-500', category: 'Audio' },
  
  // Documents
  'application/pdf': { icon: FileText, color: 'text-red-500', category: 'Document' },
  'application/msword': { icon: FileText, color: 'text-blue-600', category: 'Document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-600', category: 'Document' },
  'application/vnd.ms-excel': { icon: Table, color: 'text-green-600', category: 'Spreadsheet' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: Table, color: 'text-green-600', category: 'Spreadsheet' },
  'application/vnd.ms-powerpoint': { icon: Presentation, color: 'text-orange-500', category: 'Presentation' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: Presentation, color: 'text-orange-500', category: 'Presentation' },
  
  // Text files
  'text/plain': { icon: FileText, color: 'text-gray-500', category: 'Text' },
  'text/csv': { icon: Table, color: 'text-green-500', category: 'Data' },
  'application/json': { icon: Code, color: 'text-yellow-500', category: 'Code' },
  'application/xml': { icon: Code, color: 'text-yellow-500', category: 'Code' },
  'text/html': { icon: Code, color: 'text-orange-500', category: 'Code' },
  'text/css': { icon: Code, color: 'text-blue-500', category: 'Code' },
  'text/javascript': { icon: Code, color: 'text-yellow-600', category: 'Code' },
  'application/javascript': { icon: Code, color: 'text-yellow-600', category: 'Code' },
  
  // Archives
  'application/zip': { icon: Archive, color: 'text-purple-600', category: 'Archive' },
  'application/x-rar-compressed': { icon: Archive, color: 'text-purple-600', category: 'Archive' },
  'application/x-7z-compressed': { icon: Archive, color: 'text-purple-600', category: 'Archive' },
  'application/gzip': { icon: Archive, color: 'text-purple-600', category: 'Archive' },
};

export function FileUpload({ 
  files, 
  onFilesChange, 
  className, 
  isMobile = false,
  maxFiles = 10,
  maxFileSize = 20, // 20MB default
  allowedTypes
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isFileTypeSupported = (type: string): boolean => {
    if (allowedTypes) {
      return allowedTypes.includes(type);
    }
    return Object.keys(SUPPORTED_FILE_TYPES).includes(type) || 
           type.startsWith('image/') || 
           type.startsWith('video/') || 
           type.startsWith('audio/');
  };

  const getFileIcon = (type: string) => {
    const fileInfo = SUPPORTED_FILE_TYPES[type as keyof typeof SUPPORTED_FILE_TYPES];
    if (fileInfo) {
      return { icon: fileInfo.icon, color: fileInfo.color, category: fileInfo.category };
    }
    
    // Fallback for unsupported types
    if (type.startsWith('image/')) return { icon: Image, color: 'text-blue-500', category: '图片' };
    if (type.startsWith('video/')) return { icon: Video, color: 'text-purple-500', category: '视频' };
    if (type.startsWith('audio/')) return { icon: Music, color: 'text-green-500', category: '音频' };
    if (type.startsWith('text/')) return { icon: FileText, color: 'text-gray-500', category: '文本' };
    
    return { icon: File, color: 'text-gray-500', category: '文件' };
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `文件 ${file.name} 太大，最大支持 ${maxFileSize}MB`;
    }
    
    // Check file type
    if (!isFileTypeSupported(file.type)) {
      return `不支持的文件类型: ${file.name}`;
    }
    
    // Check total file count
    if (files.length >= maxFiles) {
      return `最多只能上传 ${maxFiles} 个文件`;
    }
    
    return null;
  };

  const handleFileRead = (file: File): Promise<FileAttachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: FileAttachment = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          data: e.target?.result as string,
        };
        resolve(attachment);
      };
      reader.onerror = () => reject(new Error(`读取文件失败: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileAttachment[] = [];
    const newErrors: string[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      if (error) {
        newErrors.push(error);
        continue;
      }
      
      try {
        const attachment = await handleFileRead(file);
        newFiles.push(attachment);
      } catch (error) {
        newErrors.push(`处理文件失败: ${file.name}`);
      }
    }
    
    setErrors(newErrors);
    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
    
    // Clear errors after 5 seconds
    setTimeout(() => setErrors([]), 5000);
  }, [files, onFilesChange, maxFiles, maxFileSize, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSupportedTypesText = () => {
    if (allowedTypes) {
      return allowedTypes.join(', ');
    }
    return '图片、视频、音频、PDF、Office文档等';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* File Upload Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg transition-colors duration-200',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          files.length >= maxFiles && 'opacity-50 pointer-events-none',
          isMobile ? 'p-3' : 'p-4'
        )}
      >
        <label className="flex flex-col items-center justify-center cursor-pointer">
          <Upload className={cn("text-gray-400 mb-2", isMobile ? "h-6 w-6" : "h-8 w-8")} />
          <span className={cn("text-gray-600 text-center", isMobile ? "text-xs" : "text-sm")}>
            拖拽文件到此处或点击上传
          </span>
          <span className={cn("text-gray-400 mt-1 text-center", isMobile ? "text-xs" : "text-xs")}>
            支持: {getSupportedTypesText()} (最大 {maxFileSize}MB)
          </span>
          <span className={cn("text-gray-400 text-center", isMobile ? "text-xs" : "text-xs")}>
            {files.length}/{maxFiles} 个文件
          </span>
          <input
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            accept={allowedTypes ? allowedTypes.join(',') : Object.keys(SUPPORTED_FILE_TYPES).join(',')}
            disabled={files.length >= maxFiles}
          />
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const { icon: IconComponent, color, category } = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors",
                  isMobile ? "p-2" : "p-3"
                )}
              >
                <IconComponent className={cn(color, isMobile ? "h-4 w-4" : "h-5 w-5")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium text-gray-900 truncate", isMobile ? "text-xs" : "text-sm")}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-gray-500", isMobile ? "text-xs" : "text-xs")}>
                      {formatFileSize(file.size)}
                    </span>
                    <span className={cn("text-gray-400", isMobile ? "text-xs" : "text-xs")}>
                      • {category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className={cn(
                    "text-gray-400 hover:text-red-500 transition-colors active:scale-95 touch-manipulation",
                    isMobile ? "p-1" : "p-1"
                  )}
                  title="移除文件"
                >
                  <X className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}