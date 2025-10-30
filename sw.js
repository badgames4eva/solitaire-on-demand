/**
 * Service Worker for Solitaire On Demand PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'solitaire-on-demand-v1.0.0';
const STATIC_CACHE_NAME = 'solitaire-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'solitaire-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './js/card.js',
    './js/deck.js',
    './js/game-state.js',
    './js/tv-remote.js',
    './js/difficulty.js',
    './js/ui.js',
    './js/game.js',
    './js/app.js'
];

// Files that should always be fetched from network when available
const NETWORK_FIRST_FILES = [
    './manifest.json'
];

// Maximum number of items in dynamic cache
const DYNAMIC_CACHE_LIMIT = 50;

/**
 * Install event - cache static files
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached successfully');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache static files', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName.startsWith('solitaire-')) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim(); // Take control of all clients
            })
    );
});

/**
 * Fetch event - handle network requests with caching strategies
 */
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip cross-origin requests (except for fonts and images)
    if (url.origin !== location.origin && 
        !request.url.includes('fonts.googleapis.com') &&
        !request.url.includes('fonts.gstatic.com')) {
        return;
    }
    
    // Handle different types of requests with appropriate strategies
    if (STATIC_FILES.includes(url.pathname) || url.pathname === '/') {
        // Cache first strategy for static files
        event.respondWith(cacheFirstStrategy(request));
    } else if (NETWORK_FIRST_FILES.some(file => url.pathname.includes(file))) {
        // Network first strategy for files that should be fresh
        event.respondWith(networkFirstStrategy(request));
    } else if (request.destination === 'image') {
        // Cache first for images
        event.respondWith(cacheFirstStrategy(request));
    } else {
        // Network first for everything else
        event.respondWith(networkFirstStrategy(request));
    }
});

/**
 * Cache first strategy - check cache first, fallback to network
 */
async function cacheFirstStrategy(request) {
    try {
        // Check static cache first
        const staticCacheResponse = await caches.match(request, {
            cacheName: STATIC_CACHE_NAME
        });
        
        if (staticCacheResponse) {
            return staticCacheResponse;
        }
        
        // Check dynamic cache
        const dynamicCacheResponse = await caches.match(request, {
            cacheName: DYNAMIC_CACHE_NAME
        });
        
        if (dynamicCacheResponse) {
            return dynamicCacheResponse;
        }
        
        // Fetch from network and cache
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            
            // Clone the response before caching
            const responseClone = networkResponse.clone();
            await cache.put(request, responseClone);
            
            // Limit dynamic cache size
            await limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        
        // Return offline fallback if available
        return getOfflineFallback(request);
    }
}

/**
 * Network first strategy - try network first, fallback to cache
 */
async function networkFirstStrategy(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            const responseClone = networkResponse.clone();
            await cache.put(request, responseClone);
            
            // Limit dynamic cache size
            await limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Network failed, trying cache:', error.message);
        
        // Fallback to cache
        const cacheResponse = await caches.match(request);
        
        if (cacheResponse) {
            return cacheResponse;
        }
        
        // Return offline fallback
        return getOfflineFallback(request);
    }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxItems) {
        // Remove oldest entries (FIFO)
        const keysToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request) {
    const url = new URL(request.url);
    
    // Return cached index.html for navigation requests
    if (request.mode === 'navigate') {
        const cachedPage = await caches.match('./index.html');
        if (cachedPage) {
            return cachedPage;
        }
    }
    
    // Return a generic offline response
    return new Response(
        JSON.stringify({
            error: 'Offline',
            message: 'This content is not available offline'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

/**
 * Background sync for game statistics
 */
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'sync-game-stats') {
        event.waitUntil(syncGameStats());
    }
});

/**
 * Sync game statistics when online
 */
async function syncGameStats() {
    try {
        // This would sync game stats to a server if implemented
        console.log('Service Worker: Syncing game statistics...');
        
        // For now, just log that sync would happen
        // In a real implementation, this would:
        // 1. Get pending stats from IndexedDB
        // 2. Send to server
        // 3. Clear pending stats on success
        
        return Promise.resolve();
    } catch (error) {
        console.error('Service Worker: Failed to sync game stats', error);
        throw error;
    }
}

/**
 * Handle push notifications (for future features)
 */
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: 'Come back and play Solitaire!',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        tag: 'solitaire-reminder',
        renotify: true,
        actions: [
            {
                action: 'play',
                title: 'Play Now',
                icon: './icons/icon-96x96.png'
            },
            {
                action: 'dismiss',
                title: 'Later',
                icon: './icons/icon-96x96.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Solitaire On Demand', options)
    );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked', event.action);
    
    event.notification.close();
    
    if (event.action === 'play') {
        // Open the game
        event.waitUntil(
            clients.openWindow('./')
        );
    }
    // 'dismiss' action or no action - just close notification
});

/**
 * Handle messages from the main app
 */
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'GET_VERSION':
                event.ports[0].postMessage({
                    version: CACHE_NAME
                });
                break;
                
            case 'CLEAR_CACHE':
                clearAllCaches().then(() => {
                    event.ports[0].postMessage({
                        success: true
                    });
                });
                break;
                
            case 'SYNC_STATS':
                // Register background sync
                self.registration.sync.register('sync-game-stats');
                break;
        }
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

/**
 * Periodic background sync (if supported)
 */
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'game-stats-sync') {
            event.waitUntil(syncGameStats());
        }
    });
}

/**
 * Handle app updates
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_UPDATE') {
        // Force update check
        self.registration.update();
    }
});

console.log('Service Worker: Loaded successfully');
