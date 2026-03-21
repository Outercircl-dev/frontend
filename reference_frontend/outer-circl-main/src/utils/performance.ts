// Performance monitoring utilities for debugging

export const measureComponentRender = (componentName: string) => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (renderTime > 100) { // Log only if render takes more than 100ms
      console.warn(`⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render`);
    } else {
      console.log(`✅ ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }
  };
};

export const measureAsyncOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const endTime = performance.now();
    const operationTime = endTime - startTime;
    
    if (operationTime > 1000) { // Log if operation takes more than 1 second
      console.warn(`⚠️ ${operationName} took ${operationTime.toFixed(2)}ms`);
    } else {
      console.log(`✅ ${operationName} completed in ${operationTime.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const operationTime = endTime - startTime;
    console.error(`❌ ${operationName} failed after ${operationTime.toFixed(2)}ms:`, error);
    throw error;
  }
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};