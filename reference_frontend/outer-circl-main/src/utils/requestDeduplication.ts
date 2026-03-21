// Global request deduplication utility
const activeRequests = new Map<string, Promise<any>>();

export const dedupRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl = 5000 // 5 second TTL for deduplication
): Promise<T> => {
  // Check if request is already in progress
  if (activeRequests.has(key)) {
    console.log(`🔄 Request deduped: ${key}`);
    return activeRequests.get(key);
  }

  // Create the request with cleanup
  const promise = requestFn().finally(() => {
    // Auto cleanup after TTL
    setTimeout(() => {
      activeRequests.delete(key);
    }, ttl);
  });

  activeRequests.set(key, promise);
  return promise;
};

// Clear all pending requests (useful for logout/cleanup)
export const clearAllRequests = () => {
  activeRequests.clear();
  console.log('🧹 All pending requests cleared');
};

// Get active request count (for debugging)
export const getActiveRequestCount = (): number => {
  return activeRequests.size;
};