/*!
 * API管理器 - 统一的API调用和缓存管理
 * 功能：智能缓存、优雅降级、统一的加载和错误处理
 * 设计：和访客信息系统保持一致的逻辑
 */
(function() {
    'use strict';
    
    // 缓存配置
    const CACHE_CONFIG = {
        // 不同类型内容的缓存时长
        joke: 30 * 60 * 1000,        // 笑话缓存30分钟
        literature: 60 * 60 * 1000,  // 文学内容缓存1小时
        quote: 60 * 60 * 1000,       // 语录缓存1小时
        news: 10 * 60 * 1000         // 新闻缓存10分钟
    };

    // API配置
    const API_CONFIG = {
        joke: {
            url: 'https://api.vvhan.com/api/text/joke',
            fallback: '今天也要开心哦！😊\n\n虽然暂时无法获取新的笑话，但希望这句话能让你微笑。记住，快乐是一种选择，每一天都值得珍惜！',
            cacheKey: 'api_joke_cache'
        },
        literature: {
            url: 'https://api.vvhan.com/api/ian/wenxue',
            fallback: '书籍是人类进步的阶梯。📚\n\n虽然暂时无法获取新的文学内容，但阅读的力量永远不会消失。每一本书都是一个新的世界，等待着我们去探索。',
            cacheKey: 'api_literature_cache'
        },
        quote: {
            url: 'https://api.vvhan.com/api/ian/rand',
            fallback: '生活就像一盒巧克力，你永远不知道下一颗是什么味道。🍫\n\n虽然暂时无法获取新的语录，但这句经典的话依然能给我们启发。保持好奇心，拥抱未知！',
            cacheKey: 'api_quote_cache'
        }
    };

    // 获取缓存数据
    function getCache(cacheKey, type) {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();
            const maxAge = CACHE_CONFIG[type] || 60 * 60 * 1000;

            if (now - data.timestamp > maxAge) {
                localStorage.removeItem(cacheKey);
                return null;
            }

            return data.content;
        } catch (e) {
            console.warn('缓存读取失败:', e);
            return null;
        }
    }

    // 设置缓存数据
    function setCache(cacheKey, content) {
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                content: content,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('缓存设置失败:', e);
        }
    }

    // 显示加载状态
    function showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
                background: rgba(0,0,0,0.02);
                border-radius: 8px;
                border: 1px dashed #ddd;
            ">
                <div style="
                    width: 16px;
                    height: 16px;
                    border: 2px solid #ddd;
                    border-top: 2px solid #007acc;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 8px;
                "></div>
                正在获取内容...
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    // 显示内容
    function showContent(containerId, content, isFromCache = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const cacheIndicator = isFromCache ? 
            '<div style="font-size: 12px; color: #999; margin-top: 8px; text-align: right;">📦 来自缓存</div>' : 
            '<div style="font-size: 12px; color: #999; margin-top: 8px; text-align: right;">🌐 实时获取</div>';

        container.innerHTML = `
            <div style="
                padding: 16px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 8px;
                border-left: 4px solid #007acc;
                line-height: 1.6;
                white-space: pre-wrap;
                word-wrap: break-word;
            ">
                ${content}
            </div>
            ${cacheIndicator}
        `;
    }

    // 显示错误/降级内容
    function showFallback(containerId, fallbackContent) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="
                padding: 16px;
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border-radius: 8px;
                border-left: 4px solid #ffc107;
                line-height: 1.6;
                white-space: pre-wrap;
                word-wrap: break-word;
            ">
                ${fallbackContent}
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 8px; text-align: right;">
                ⚠️ 离线模式 | 
                <a href="javascript:void(0)" onclick="window.APIManager.retry('${containerId}')" style="color: #007acc; text-decoration: none;">重试</a>
            </div>
        `;
    }

    // 主要的API调用函数
    function loadContent(type, containerId) {
        const config = API_CONFIG[type];
        if (!config) {
            console.error('未知的API类型:', type);
            return;
        }

        // 首先尝试使用缓存
        const cachedContent = getCache(config.cacheKey, type);
        if (cachedContent) {
            showContent(containerId, cachedContent, true);
            return;
        }

        // 显示加载状态
        showLoading(containerId);

        // 获取新内容
        fetch(config.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                if (data && data.trim()) {
                    // 缓存新内容
                    setCache(config.cacheKey, data);
                    // 显示内容
                    showContent(containerId, data, false);
                } else {
                    throw new Error('API返回空内容');
                }
            })
            .catch(error => {
                console.warn(`获取${type}内容失败:`, error);
                
                // 显示降级内容
                showFallback(containerId, config.fallback);
            });
    }

    // 重试函数
    function retry(containerId) {
        // 从容器ID推断类型
        let type = 'quote'; // 默认类型
        
        // 根据页面URL或容器ID推断类型
        const path = window.location.pathname;
        if (path.includes('collection')) {
            type = 'joke';
        } else if (path.includes('friends')) {
            type = 'literature';
        } else if (path.includes('about')) {
            type = 'quote';
        }

        loadContent(type, containerId);
    }

    // 清除所有缓存
    function clearAllCache() {
        Object.values(API_CONFIG).forEach(config => {
            localStorage.removeItem(config.cacheKey);
        });
        console.log('所有API缓存已清除');
    }

    // 获取缓存状态
    function getCacheStatus() {
        const status = {};
        Object.entries(API_CONFIG).forEach(([type, config]) => {
            const cached = getCache(config.cacheKey, type);
            status[type] = {
                hasCached: !!cached,
                cacheKey: config.cacheKey,
                content: cached ? cached.substring(0, 50) + '...' : null
            };
        });
        return status;
    }

    // 暴露到全局
    window.APIManager = {
        loadContent,
        retry,
        clearAllCache,
        getCacheStatus,
        
        // 兼容性方法
        loadJoke: (containerId) => loadContent('joke', containerId),
        loadLiterature: (containerId) => loadContent('literature', containerId),
        loadQuote: (containerId) => loadContent('quote', containerId)
    };

    // 调试信息
    console.log('🔧 API管理器已加载，可用方法:', Object.keys(window.APIManager));

})();
