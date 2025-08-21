import { useState, useEffect, useCallback } from 'react';
import { conversationDB } from '../utils/conversationDB';
import { userManager } from '../utils/userManager';
import type { Conversation } from '../types/chat';

// 为非对话数据保留localStorage，为对话数据使用IndexedDB
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      // 计算存储大小
      const jsonString = JSON.stringify(valueToStore);
      const sizeInBytes = new Blob([jsonString]).size;
      
      // 如果数据太大（>1MB），给出警告
      if (sizeInBytes > 1024 * 1024) {
        console.warn(`Large data being stored in localStorage (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) for key "${key}"`);
      }
      
      window.localStorage.setItem(key, jsonString);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      
      // 如果是存储空间超出错误，尝试清理
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting to clean up...');
        try {
          // 清理一些可能的临时数据
          const keysToCheck = ['temp_', 'cache_', 'old_'];
          for (const prefix of keysToCheck) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (k && k.startsWith(prefix)) {
                localStorage.removeItem(k);
              }
            }
          }
          // 再次尝试存储
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (retryError) {
          console.error('Failed to save after cleanup:', retryError);
        }
      }
    }
  }, [storedValue, key]);

  return [storedValue, setValue] as const;
}

// 专用于对话管理的hook - 集成用户管理
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(userManager.getOrCreateDefaultUser());

  // 切换用户
  const switchUser = useCallback(async (userId: string) => {
    try {
      userManager.setCurrentUser(userId);
      const user = userManager.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        conversationDB.setUserId(user.id);
        // 重新加载该用户的对话
        await loadConversations();
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
      setError('Failed to switch user');
    }
  }, []);

  // 创建新用户
  const createUser = useCallback(async (name: string) => {
    try {
      const newUser = userManager.createUser(name);
      setCurrentUser(newUser);
      conversationDB.setUserId(newUser.id);
      setConversations([]); // 新用户没有对话历史
      return newUser;
    } catch (err) {
      console.error('Failed to create user:', err);
      setError('Failed to create user');
      return null;
    }
  }, []);

  // 初始化用户设置
  useEffect(() => {
    const user = userManager.getOrCreateDefaultUser();
    setCurrentUser(user);
    conversationDB.setUserId(user.id);
  }, []);

  // 加载所有对话
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const convs = await conversationDB.getAllConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations');
      
      // 如果IndexedDB失败，尝试从localStorage迁移
      try {
        const fallback = localStorage.getItem('gemini-conversations');
        if (fallback) {
          const oldConvs = JSON.parse(fallback);
          if (Array.isArray(oldConvs)) {
            setConversations(oldConvs);
            // 尝试迁移到IndexedDB
            console.log('🔄 Migrating conversations from localStorage to IndexedDB...');
            for (const conv of oldConvs) {
              try {
                await conversationDB.saveConversation(conv);
              } catch (saveErr) {
                console.error('Failed to migrate conversation:', conv.id, saveErr);
              }
            }
            // 迁移成功后清理localStorage（备份方式）
            try {
              localStorage.setItem('gemini-conversations-backup', fallback);
              localStorage.removeItem('gemini-conversations');
              console.log('✅ Migration completed. Backup saved to localStorage.');
            } catch (backupErr) {
              console.warn('Migration completed but backup failed:', backupErr);
            }
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 保存单个对话
  const saveConversation = useCallback(async (conversation: Conversation) => {
    try {
      await conversationDB.saveConversation(conversation);
      setConversations(prev => {
        const existing = prev.findIndex(c => c.id === conversation.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = conversation;
          return updated;
        } else {
          return [conversation, ...prev];
        }
      });
    } catch (err) {
      console.error('Failed to save conversation:', err);
      setError('Failed to save conversation');
      
      // 如果IndexedDB失败，尝试降级到localStorage（紧急备份）
      try {
        const existingData = localStorage.getItem('gemini-conversations-emergency') || '[]';
        const conversations = JSON.parse(existingData);
        const updated = conversations.filter((c: Conversation) => c.id !== conversation.id);
        updated.unshift(conversation);
        localStorage.setItem('gemini-conversations-emergency', JSON.stringify(updated.slice(0, 5))); // 只保留最近5个
        console.warn('Saved to emergency localStorage backup');
      } catch (emergencyErr) {
        console.error('Emergency backup also failed:', emergencyErr);
      }
    }
  }, []);

  // 删除对话
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await conversationDB.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
    }
  }, []);

  // 清理旧对话
  const cleanupOldConversations = useCallback(async (keepCount: number = 50) => {
    try {
      const deletedCount = await conversationDB.deleteOldConversations(keepCount);
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old conversations`);
        await loadConversations(); // 重新加载
      }
      return deletedCount;
    } catch (err) {
      console.error('Failed to cleanup conversations:', err);
      return 0;
    }
  }, [loadConversations]);

  // 获取存储使用情况
  const getStorageUsage = useCallback(async () => {
    try {
      return await conversationDB.getStorageUsage();
    } catch (err) {
      console.error('Failed to get storage usage:', err);
      return { used: 0, quota: 0 };
    }
  }, []);

  // 导出用户数据
  const exportUserData = useCallback(async () => {
    try {
      const data = {
        user: currentUser,
        conversations: conversations,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gemini-conversations-${currentUser.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      console.error('Failed to export data:', err);
      return false;
    }
  }, [currentUser, conversations]);

  // 导入用户数据
  const importUserData = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.conversations && Array.isArray(data.conversations)) {
        for (const conv of data.conversations) {
          await conversationDB.saveConversation(conv);
        }
        await loadConversations();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to import data:', err);
      return false;
    }
  }, [loadConversations]);

  // 初始化
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    // 对话管理
    conversations,
    isLoading,
    error,
    saveConversation,
    deleteConversation,
    cleanupOldConversations,
    getStorageUsage,
    reload: loadConversations,
    
    // 用户管理
    currentUser,
    switchUser,
    createUser,
    getAllUsers: userManager.getUsers,
    
    // 数据管理
    exportUserData,
    importUserData,
  };
}

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
    isLandscape: screenSize.width > screenSize.height,
    isPortrait: screenSize.height > screenSize.width,
  };
}