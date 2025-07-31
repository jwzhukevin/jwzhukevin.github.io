/*!
 * 资源优化器 - 提升网站加载性能
 * 功能：图片懒加载、资源预加载、缓存优化
 */
(function() {
    'use strict';
    
    // 配置选项
    const CONFIG = {
        // 图片懒加载配置
        lazyLoad: {
            enabled: true,
            rootMargin: '50px 0px',
            threshold: 0.1
        },
        
        // 资源预加载配置
        preload: {
            enabled: true,
            fonts: true,
            criticalCSS: true,
            nextPage: false // 预加载下一页（可选）
        },
        
        // 缓存配置
        cache: {
            enabled: true,
            version: '1.0.0',
            resources: ['css', 'js', 'fonts']
        }
    };
    
    // 工具函数
    const utils = {
        // 检查浏览器支持
        supports: {
            webp: false,
            avif: false,
            lazyLoading: 'loading' in HTMLImageElement.prototype,
            intersectionObserver: 'IntersectionObserver' in window,
            serviceWorker: 'serviceWorker' in navigator
        },
        
        // 检测WebP支持
        checkWebPSupport: function() {
            return new Promise((resolve) => {
                const webP = new Image();
                webP.onload = webP.onerror = function () {
                    resolve(webP.height === 2);
                };
                webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
            });
        },
        
        // 检测AVIF支持
        checkAVIFSupport: function() {
            return new Promise((resolve) => {
                const avif = new Image();
                avif.onload = avif.onerror = function () {
                    resolve(avif.height === 2);
                };
                avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
            });
        },
        
        // 获取设备信息
        getDeviceInfo: function() {
            return {
                isMobile: /Mobi|Android/i.test(navigator.userAgent),
                isLowEnd: navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2,
                connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
            };
        }
    };
    
    // 图片优化器
    const ImageOptimizer = {
        init: function() {
            if (!CONFIG.lazyLoad.enabled) return;
            
            this.setupLazyLoading();
            this.optimizeExistingImages();
        },
        
        // 设置懒加载
        setupLazyLoading: function() {
            if (utils.supports.lazyLoading) {
                // 浏览器原生支持
                console.log('📷 使用浏览器原生图片懒加载');
                return;
            }
            
            if (!utils.supports.intersectionObserver) {
                console.warn('📷 浏览器不支持IntersectionObserver，跳过懒加载');
                return;
            }
            
            // 使用Intersection Observer实现懒加载
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: CONFIG.lazyLoad.rootMargin,
                threshold: CONFIG.lazyLoad.threshold
            });
            
            // 观察所有懒加载图片
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                observer.observe(img);
            });
            
            console.log('📷 图片懒加载已启用');
        },
        
        // 加载图片
        loadImage: function(img) {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
            
            img.classList.add('loaded');
        },
        
        // 优化现有图片
        optimizeExistingImages: function() {
            const images = document.querySelectorAll('img:not([loading])');
            
            images.forEach(img => {
                // 添加解码优化
                img.decoding = 'async';
                
                // 添加加载完成事件
                img.addEventListener('load', function() {
                    this.classList.add('loaded');
                }, { once: true });
                
                // 添加错误处理
                img.addEventListener('error', function() {
                    this.classList.add('error');
                    console.warn('📷 图片加载失败:', this.src);
                }, { once: true });
            });
        }
    };
    
    // 资源预加载器
    const ResourcePreloader = {
        init: function() {
            if (!CONFIG.preload.enabled) return;
            
            this.preloadFonts();
            this.preloadCriticalResources();
        },
        
        // 预加载字体
        preloadFonts: function() {
            if (!CONFIG.preload.fonts) return;
            
            const fonts = [
                '/fonts/MaShanZheng-Regular.ttf',
                '/fonts/NeverMindHand-Regular.ttf'
            ];
            
            fonts.forEach(font => {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = font;
                link.as = 'font';
                link.type = 'font/ttf';
                link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
            });
            
            console.log('🔤 字体预加载已启用');
        },
        
        // 预加载关键资源
        preloadCriticalResources: function() {
            // 预加载关键CSS
            const criticalCSS = document.querySelector('link[rel="stylesheet"]');
            if (criticalCSS && CONFIG.preload.criticalCSS) {
                const preloadLink = document.createElement('link');
                preloadLink.rel = 'preload';
                preloadLink.href = criticalCSS.href;
                preloadLink.as = 'style';
                document.head.insertBefore(preloadLink, criticalCSS);
            }
            
            // 预加载下一页（如果启用）
            if (CONFIG.preload.nextPage) {
                this.preloadNextPage();
            }
        },
        
        // 预加载下一页
        preloadNextPage: function() {
            const nextLink = document.querySelector('a[rel="next"]');
            if (nextLink) {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = nextLink.href;
                document.head.appendChild(link);
            }
        }
    };
    
    // 缓存管理器
    const CacheManager = {
        init: function() {
            if (!CONFIG.cache.enabled || !utils.supports.serviceWorker) return;
            
            this.registerServiceWorker();
        },
        
        // 注册Service Worker
        registerServiceWorker: function() {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('💾 Service Worker注册成功');
                })
                .catch(error => {
                    console.warn('💾 Service Worker注册失败:', error);
                });
        }
    };
    
    // 性能监控
    const PerformanceMonitor = {
        init: function() {
            this.monitorPageLoad();
            this.monitorResourceLoad();
        },
        
        // 监控页面加载
        monitorPageLoad: function() {
            window.addEventListener('load', () => {
                if ('performance' in window) {
                    const timing = performance.timing;
                    const loadTime = timing.loadEventEnd - timing.navigationStart;
                    console.log(`⚡ 页面加载时间: ${loadTime}ms`);
                    
                    // 发送性能数据（可选）
                    this.sendPerformanceData({
                        loadTime: loadTime,
                        domReady: timing.domContentLoadedEventEnd - timing.navigationStart
                    });
                }
            });
        },
        
        // 监控资源加载
        monitorResourceLoad: function() {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (entry.duration > 1000) {
                            console.warn(`🐌 慢资源: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['resource'] });
            }
        },
        
        // 发送性能数据
        sendPerformanceData: function(data) {
            // 这里可以发送到分析服务
            // 例如：Google Analytics, 自定义分析等
        }
    };
    
    // 主初始化函数
    function init() {
        console.log('🚀 资源优化器启动');
        
        // 检测浏览器支持
        Promise.all([
            utils.checkWebPSupport(),
            utils.checkAVIFSupport()
        ]).then(([webp, avif]) => {
            utils.supports.webp = webp;
            utils.supports.avif = avif;
            
            console.log('🖼️ 图片格式支持:', {
                WebP: webp,
                AVIF: avif
            });
        });
        
        // 初始化各个模块
        ImageOptimizer.init();
        ResourcePreloader.init();
        CacheManager.init();
        PerformanceMonitor.init();
        
        console.log('✅ 资源优化器初始化完成');
    }
    
    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 暴露到全局（用于调试）
    window.ResourceOptimizer = {
        CONFIG,
        utils,
        ImageOptimizer,
        ResourcePreloader,
        CacheManager,
        PerformanceMonitor
    };
    
})();
