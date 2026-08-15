// In-Memory & Redis-Ready Speed Cache Layer for Ultra-Fast API Responses (<1ms)
const memoryCache = new Map();

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
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    // Prune oldest items if cache grows large
    if (memoryCache.size > 1000) {
      const firstKey = memoryCache.keys().next().value;
      if (firstKey) memoryCache.delete(firstKey);
    }
  } catch {}
}

export async function delCache(key) {
  try {
    memoryCache.delete(key);
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
