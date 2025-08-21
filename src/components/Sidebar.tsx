import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Plus, Trash2, Settings, X, Download, Sliders, Activity, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import type { Conversation } from '../types/chat';
import { GEMINI_MODELS } from '../config/gemini';
import { cn } from '../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onExportConversation: (id: string, format?: 'txt' | 'html' | 'pdf') => void;
  onOpenSettings: () => void;
  onOpenAdvancedSettings: () => void;
  onOpenPerformanceMonitor: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  isMobile?: boolean;
}

export function Sidebar({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onExportConversation,
  onOpenSettings,
  onOpenAdvancedSettings,
  onOpenPerformanceMonitor,
  selectedModel,
  onModelChange,
  isMobile = false,
}: SidebarProps) {
  const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.export-dropdown')) {
          setExportDropdownOpen(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40 lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'sidebar fixed top-0 left-0 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50',
          'lg:relative lg:translate-x-0 lg:shadow-none lg:border-r',
          isMobile ? 'w-80 sm:w-96' : 'w-80',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Gemini Chat</h1>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Model Selection */}
          <div className="p-3 sm:p-4 border-b bg-gray-50">
            <Select
              label="Model"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              options={GEMINI_MODELS.map(model => ({
                value: model.id,
                label: model.name,
              }))}
            />
            <div className="mt-2 text-xs text-gray-500">
              {GEMINI_MODELS.find(m => m.id === selectedModel)?.description}
            </div>
          </div>

          {/* New Conversation Button */}
          <div className="p-3 sm:p-4">
            <Button
              onClick={onNewConversation}
              className="w-full justify-start"
              variant="secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4">
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Start a new conversation to begin</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      'group flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                      'hover:bg-gray-100 active:bg-gray-200',
                      currentConversationId === conversation.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'border border-transparent'
                    )}
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <MessageCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(conversation.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                      <div className="relative export-dropdown">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExportDropdownOpen(
                              exportDropdownOpen === conversation.id ? null : conversation.id
                            );
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 transition-all rounded flex items-center"
                          title="Export conversation"
                        >
                          <Download className="h-3 w-3" />
                          <ChevronDown className="h-2 w-2 ml-0.5" />
                        </button>
                        
                        {exportDropdownOpen === conversation.id && (
                          <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExportConversation(conversation.id, 'txt');
                                setExportDropdownOpen(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                            >
                              TXT
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExportConversation(conversation.id, 'html');
                                setExportDropdownOpen(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              HTML
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExportConversation(conversation.id, 'pdf');
                                setExportDropdownOpen(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 last:rounded-b-lg"
                            >
                              PDF
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-all rounded"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Settings Buttons */}
          <div className="p-3 sm:p-4 border-t bg-white space-y-2">
            <Button
              onClick={onOpenSettings}
              variant="ghost"
              className="w-full justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              API Settings
            </Button>
            <Button
              onClick={onOpenAdvancedSettings}
              variant="ghost"
              className="w-full justify-start"
            >
              <Sliders className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
            <Button
              onClick={onOpenPerformanceMonitor}
              variant="ghost"
              className="w-full justify-start"
            >
              <Activity className="h-4 w-4 mr-2" />
              Performance Monitor
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}