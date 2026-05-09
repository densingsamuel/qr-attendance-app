const CACHE_NAME = 'qr-attend-v1';

// Files to cache for offline use
const urlsToCache = [
    '/',
    '/login',
    '/dashboard',
    '/scan',
];

// Install event — cache core files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Activate event — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event — network first, cache fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests (POST, PUT, DELETE, etc.)
    if (event.request.method !== 'GET') return;

    // Skip Supabase and other API calls to ensure Realtime works
    if (event.request.url.includes('supabase.co') || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;
                
                // If no cache match and network fails, return a basic error response
                return new Response('Network error occurred', { status: 408, statusText: 'Network Error' });
            })
    );
});
