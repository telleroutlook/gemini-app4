// IndexedDB 存储管理器 - 支持多用户
class ConversationDB {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'GeminiConversations';
  private readonly version = 1;
  private readonly storeName = 'conversations';
  private currentUserId: string = 'default';

  setUserId(userId: string): void {
    this.currentUserId = userId;
  }

  private getUserKey(conversationId: string): string {
    return `${this.currentUserId}:${conversationId}`;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对话存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'userConversationId' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async saveConversation(conversation: any): Promise<void> {
    if (!this.db) await this.init();
    
    const userConversation = {
      ...conversation,
      userId: this.currentUserId,
      userConversationId: this.getUserKey(conversation.id),
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(userConversation);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getConversation(id: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(this.getUserKey(id));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // 移除用户特定的属性，返回原始对话
          const { userId, userConversationId, ...conversation } = result;
          resolve(conversation);
        } else {
          resolve(null);
        }
      };
    });
  }

  async getAllConversations(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');
      const request = index.openCursor(IDBKeyRange.only(this.currentUserId));

      const conversations: any[] = [];
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const { userId, userConversationId, ...conversation } = cursor.value;
          conversations.push(conversation);
          cursor.continue();
        } else {
          // 按更新时间排序
          conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(conversations);
        }
      };
    });
  }

  async deleteConversation(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(this.getUserKey(id));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteOldConversations(keepCount: number = 50): Promise<number> {
    if (!this.db) await this.init();

    const conversations = await this.getAllConversations();
    if (conversations.length <= keepCount) return 0;

    const toDelete = conversations.slice(keepCount);
    let deletedCount = 0;

    for (const conv of toDelete) {
      try {
        await this.deleteConversation(conv.id);
        deletedCount++;
      } catch (error) {
        console.error('Failed to delete conversation:', conv.id, error);
      }
    }

    return deletedCount;
  }

  async deleteUserData(userId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');
      const request = index.openCursor(IDBKeyRange.only(userId));

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const conversationDB = new ConversationDB();