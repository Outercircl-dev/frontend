// Enhanced service worker with better caching strategies
const CACHE_VERSION = '3.0.0';
const STATIC_CACHE = `outercircl-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `outercircl-dynamic-${CACHE_VERSION}`;
const API_CACHE = `outercircl-api-${CACHE_VERSION}`;

// Enhanced static assets list
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/lovable-uploads/b4e2c4bb-eb54-48e0-b1ff-69d41bc537fa.png',
  '/lovable-uploads/76cfb7c3-9869-4a7a-abf6-1a5688ae9f15.png',
  '/lovable-uploads/bb54d9cc-c97c-412f-959c-d981b768d807.png',
  '/lovable-uploads/8f6f4c91-8281-45b1-b7e4-27b7b5358bb8.png'
];

// Cache strategies configuration
const CACHE_STRATEGIES = {
  staleWhileRevalidate: ['/dashboard', '/profile', '/events'],
  cacheFirst: ['/static/', '/assets/', '/fonts/', '/_app/'],
  networkFirst: ['/api/', '/auth/']
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Cache strategy for different types of resources
  if (url.origin === location.origin) {
    // Same origin requests
    if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
      // Static assets - cache first
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else if (url.pathname.startsWith('/lovable-uploads/')) {
      // Images - cache first with fallback
      event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    } else if (url.pathname === '/' || url.pathname.includes('.html')) {
      // HTML pages - network first with cache fallback
      event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    } else {
      // Other assets - stale while revalidate
      event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    }
  } else if (url.hostname === 'images.unsplash.com') {
    // External images - cache with expiration
    event.respondWith(cacheWithExpiration(request, DYNAMIC_CACHE, 86400000)); // 24 hours
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Google Fonts - cache first
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

// Cache first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Cache first failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline content not available', { status: 503 });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Fetch in background to update cache
    const fetchPromise = fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });
    
    // Return cached version immediately, or wait for network
    return cachedResponse || await fetchPromise;
  } catch (error) {
    console.log('Stale while revalidate failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

// Cache with expiration
async function cacheWithExpiration(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const dateHeader = cachedResponse.headers.get('date');
      const date = new Date(dateHeader);
      const now = new Date();
      
      if (now.getTime() - date.getTime() < maxAge) {
        return cachedResponse;
      }
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Network error', { status: 408 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement offline action sync here
  console.log('📡 Service Worker: Performing background sync');
}
