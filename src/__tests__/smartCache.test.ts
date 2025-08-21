import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SmartCache, useSmartCache } from '../utils/smartCache';

describe('SmartCache', () => {
  it('should store and retrieve data', () => {
    const cache = new SmartCache<string>(1); // 1MB limit
    
    cache.set('test-key', 'test-value');
    expect(cache.get('test-key')).toBe('test-value');
  });

  it('should handle TTL expiration', async () => {
    const cache = new SmartCache<string>(1);
    
    cache.set('test-key', 'test-value', 100); // 100ms TTL
    expect(cache.get('test-key')).toBe('test-value');
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('test-key')).toBeUndefined();
  });

  it('should evict entries when memory limit is reached', () => {
    const cache = new SmartCache<string>(1); // 1MB limit
    
    // Fill cache with large entries
    for (let i = 0; i < 1000; i++) {
      const largeString = 'x'.repeat(1000); // 1KB each
      cache.set(`key-${i}`, largeString);
    }
    
    // Should have evicted some entries
    expect(cache.getStats().entries).toBeLessThan(1000);
  });

  it('should provide accurate statistics', () => {
    const cache = new SmartCache<string>(1);
    
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    const stats = cache.getStats();
    expect(stats.entries).toBe(2);
    expect(stats.size).toBeGreaterThan(0);
  });
});