import { useMemo, useCallback, startTransition, useDeferredValue } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  size: number;
}

/**
 * 高性能智能缓存管理器
 * 结合LFU、TTL和大小限制的混合策略
 */
export class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize = 50 * 1024 * 1024; // 50MB
  private maxEntries = 1000;
  private currentSize = 0;
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(maxSizeMB: number = 50, maxEntries: number = 1000) {
    this.maxSize = maxSizeMB * 1024 * 1024;
    this.maxEntries = maxEntries;
    
    // 定期清理过期条目
    setInterval(() => this.cleanExpired(), 5 * 60 * 1000); // 5分钟
  }

  set(key: string, data: T, ttl: number = 30 * 60 * 1000): void {
    const size = this.estimateSize(data);
    
    // 检查是否需要清理空间
    this.makeSpace(size);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now() + ttl, // TTL作为过期时间
      accessCount: 1,
      size
    };
    
    // 如果key已存在，先删除旧条目
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSize -= oldEntry.size;
    }
    
    this.cache.set(key, entry);
    this.currentSize += size;
    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // 检查是否过期
    if (Date.now() > entry.timestamp) {
      this.delete(key);
      return undefined;
    }
    
    // 更新访问统计
    entry.accessCount++;
    this.accessOrder.set(key, ++this.accessCounter);
    
    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.currentSize -= entry.size;
    
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
    this.accessCounter = 0;
  }

  // 获取缓存统计信息
  getStats() {
    return {
      entries: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxSize,
      utilization: (this.currentSize / this.maxSize * 100).toFixed(2) + '%'
    };
  }

  private makeSpace(newSize: number): void {
    // 检查条目数量限制
    while (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }
    
    // 检查大小限制
    while (this.currentSize + newSize > this.maxSize && this.cache.size > 0) {
      this.evictOptimal();
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;
    
    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private evictOptimal(): void {
    let victimKey = '';
    let minScore = Infinity;
    
    for (const [key, entry] of this.cache) {
      const now = Date.now();
      const age = now - (entry.timestamp - 30 * 60 * 1000); // 相对于创建时间的年龄
      const timeToExpire = Math.max(0, entry.timestamp - now);
      
      // 综合评分：年龄权重40%，访问频率权重30%，大小权重20%，过期时间权重10%
      const ageScore = age / (1000 * 60); // 分钟
      const accessScore = 1 / Math.max(entry.accessCount, 1);
      const sizeScore = entry.size / (1024 * 1024); // MB
      const expireScore = 1 / Math.max(timeToExpire / (1000 * 60), 1); // 即将过期的分数更高
      
      const score = (ageScore * 0.4) + (accessScore * 0.3) + (sizeScore * 0.2) + (expireScore * 0.1);
      
      if (score < minScore) {
        minScore = score;
        victimKey = key;
      }
    }
    
    if (victimKey) {
      this.delete(victimKey);
    }
  }

  private cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
  }

  private estimateSize(data: T): number {
    try {
      const json = JSON.stringify(data);
      // UTF-16编码，每个字符2字节，加上对象开销
      return json.length * 2 + 100;
    } catch {
      // 如果无法序列化，使用默认大小
      return 1024; // 1KB
    }
  }
}

/**
 * React Hook: 智能缓存
 */
export function useSmartCache<T>(maxSizeMB: number = 20) {
  const cache = useMemo(() => new SmartCache<T>(maxSizeMB), [maxSizeMB]);
  
  const get = useCallback((key: string) => {
    return cache.get(key);
  }, [cache]);
  
  const set = useCallback((key: string, data: T, ttl?: number) => {
    startTransition(() => {
      cache.set(key, data, ttl);
    });
  }, [cache]);
  
  const remove = useCallback((key: string) => {
    return cache.delete(key);
  }, [cache]);
  
  const clear = useCallback(() => {
    cache.clear();
  }, [cache]);
  
  const stats = useMemo(() => cache.getStats(), [cache]);
  
  return {
    get,
    set,
    remove,
    clear,
    stats
  };
}

/**
 * React Hook: 带缓存的异步数据获取
 */
export function useCachedAsync<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    staleWhileRevalidate?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const { get, set } = useSmartCache<T>();
  const deferredKey = useDeferredValue(key);
  
  const fetchData = useCallback(async () => {
    try {
      // 先检查缓存
      const cached = get(deferredKey);
      if (cached && !options.staleWhileRevalidate) {
        return cached;
      }
      
      // 获取新数据
      const fresh = await fetcher();
      
      // 更新缓存
      set(deferredKey, fresh, options.ttl);
      
      return fresh;
    } catch (error) {
      // 如果获取失败，返回缓存的数据（如果有的话）
      const cached = get(deferredKey);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }, [deferredKey, fetcher, get, set, options]);
  
  // 定期刷新（如果启用）
  useMemo(() => {
    if (options.refreshInterval) {
      const interval = setInterval(() => {
        startTransition(() => {
          fetchData();
        });
      }, options.refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [fetchData, options.refreshInterval]);
  
  return {
    fetchData,
    getCached: () => get(deferredKey)
  };
}

// 全局缓存实例
export const globalCache = new SmartCache(100); // 100MB全局缓存