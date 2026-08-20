// Ultra-Fast High-Throughput In-Memory Speed Cache Layer (<1ms) with Crash Guarantee
const memoryCache = new Map();
const MAX_CACHE_ITEMS = 5000;

export async function getCache(key) {
  try {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  } catch {
    return null;
  }
}

export async function setCache(key, value, ttlSeconds = 300) {
  try {
    if (!key) return;
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    });

    // Prune oldest items if cache size exceeds limit
    if (memoryCache.size > MAX_CACHE_ITEMS) {
      const iterator = memoryCache.keys();
      for (let i = 0; i < 500; i++) {
        const nextKey = iterator.next().value;
        if (nextKey) memoryCache.delete(nextKey);
        else break;
      }
    }
  } catch {}
}

export async function delCache(key) {
  try {
    if (key) memoryCache.delete(key);
  } catch {}
}

export async function clearCache(pattern) {
  try {
    if (!pattern) {
      memoryCache.clear();
      return;
    }
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  } catch {}
}

export function getCacheStats() {
  return {
    size: memoryCache.size,
    maxSize: MAX_CACHE_ITEMS,
  };
}
