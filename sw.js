/*!
 * Service Worker - 离线缓存和性能优化
 * 为Hugo博客提供离线访问能力和资源缓存
 */

const CACHE_NAME = 'hugo-blog-v1.0.0';
const OFFLINE_PAGE = '/offline/';

// 需要缓存的核心资源
const CORE_ASSETS = [
    '/',
    '/css/font-awesome.min.css',
    '/js/jquery.min.js',
    '/js/resource-optimizer.js',
    '/js/space-bg.js',
    '/img/logo.webp',
    '/fonts/MaShanZheng-Regular.ttf',
    '/fonts/NeverMindHand-Regular.ttf'
];

// 需要缓存的页面（根据你的网站结构调整）
const CACHE_PAGES = [
    '/',
    '/about/',
    '/archives/',
    '/posts/',
    '/search/'
];

// 安装事件 - 预缓存核心资源
self.addEventListener('install', event => {
    console.log('📦 Service Worker 安装中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 预缓存核心资源');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker 安装完成');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Service Worker 安装失败:', error);
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker 激活中...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker 激活完成');
                return self.clients.claim();
            })
    );
});

// 获取事件 - 缓存策略
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // 对于外部请求，直接转发给网络，不进行缓存处理
    if (url.origin !== location.origin) {
        event.respondWith(fetch(request));
        return;
    }

    // 根据资源类型选择缓存策略
    if (request.method === 'GET') {
        event.respondWith(handleRequest(request));
    }
});

// 处理请求的主要函数
async function handleRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    try {
        // 1. HTML页面 - 网络优先，缓存备用
        if (request.headers.get('accept')?.includes('text/html')) {
            return await handlePageRequest(request);
        }
        
        // 2. 静态资源 - 缓存优先
        if (isStaticAsset(pathname)) {
            return await handleAssetRequest(request);
        }
        
        // 3. API请求 - 网络优先，短期缓存
        if (pathname.startsWith('/api/')) {
            return await handleApiRequest(request);
        }
        
        // 4. 其他请求 - 直接网络请求
        return await fetch(request);
        
    } catch (error) {
        console.error('请求处理失败:', error);
        return await handleOfflineRequest(request);
    }
}

// 处理页面请求 - 网络优先策略
async function handlePageRequest(request) {
    try {
        // 尝试网络请求
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存成功的响应
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('网络响应失败');
        
    } catch (error) {
        // 网络失败，尝试缓存
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 返回离线页面
        return await caches.match(OFFLINE_PAGE) || new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title></head><body><h1>Network Connection Failed</h1><p>Please check your network connection and try again</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
}

// 处理静态资源请求 - 缓存优先策略
async function handleAssetRequest(request) {
    // 先检查缓存
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        // 缓存未命中，请求网络
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存响应
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        // 网络失败，返回占位符或错误响应
        if (request.url.includes('.jpg') || request.url.includes('.png') || request.url.includes('.webp')) {
            // 图片占位符
            return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f0f0f0"/><text x="200" y="150" text-anchor="middle" fill="#999">Image Load Failed</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } }
            );
        }
        
        throw error;
    }
}

// 处理API请求 - 网络优先，短期缓存
async function handleApiRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 短期缓存API响应（5分钟）
            const cache = await caches.open(CACHE_NAME);
            const responseToCache = networkResponse.clone();
            
            // 添加过期时间头
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cache-time', Date.now().toString());
            
            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });
            
            cache.put(request, cachedResponse);
        }
        
        return networkResponse;
        
    } catch (error) {
        // 检查缓存的API响应
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            const cacheTime = cachedResponse.headers.get('sw-cache-time');
            const now = Date.now();
            
            // 如果缓存时间小于5分钟，使用缓存
            if (cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
                return cachedResponse;
            }
        }
        
        throw error;
    }
}

// 处理离线请求
async function handleOfflineRequest(request) {
    if (request.headers.get('accept')?.includes('text/html')) {
        return await caches.match(OFFLINE_PAGE) || new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title></head><body><h1>Offline Mode</h1><p>No network connection available</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
    
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// 判断是否为静态资源
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname.startsWith('/static/');
}

// 消息处理 - 与主线程通信
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_INFO') {
        caches.open(CACHE_NAME).then(cache => {
            cache.keys().then(keys => {
                event.ports[0].postMessage({
                    type: 'CACHE_INFO',
                    count: keys.length,
                    size: keys.length * 1024 // 估算大小
                });
            });
        });
    }
});

// 后台同步（如果支持）
if ('sync' in self.registration) {
    self.addEventListener('sync', event => {
        if (event.tag === 'background-sync') {
            event.waitUntil(doBackgroundSync());
        }
    });
}

// 后台同步函数
async function doBackgroundSync() {
    try {
        // 这里可以执行后台同步任务
        // 例如：同步离线时的用户操作、更新缓存等
        console.log('🔄 执行后台同步');
    } catch (error) {
        console.error('❌ 后台同步失败:', error);
    }
}

console.log('🚀 Service Worker 已加载');
