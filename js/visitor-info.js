/*!
 * 访客信息显示组件 - 性能优化版本
 * 功能：显示访客的地理位置、设备信息、天气等
 * 特点：智能缓存、优雅降级、性能优化
 */
(function() {
    'use strict';
    
    // 缓存配置
    const CACHE_KEYS = {
        weather: 'visitor_weather_cache',
        location: 'visitor_location_cache',
        device: 'visitor_device_cache'
    };

    const CACHE_DURATION = {
        weather: 60 * 60 * 1000,      // 天气信息缓存1小时
        location: 24 * 60 * 60 * 1000, // 地理位置缓存24小时
        device: 7 * 24 * 60 * 60 * 1000 // 设备信息缓存7天
    };

    // 获取缓存数据
    function getCache(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            if (now - data.timestamp > CACHE_DURATION[key.split('_')[1]]) {
                localStorage.removeItem(key);
                return null;
            }

            return data.value;
        } catch (e) {
            return null;
        }
    }

    // 设置缓存数据
    function setCache(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
        } catch (e) {
            // localStorage不可用时静默失败
        }
    }

    // 渲染访客信息
    function renderVisitorInfo(info) {
        const container = document.getElementById('visitor-info');
        if (!container) return;

        // 创建HTML内容，避免在YAML中使用复杂的模板字符串
        const welcomeDiv = document.createElement('div');
        welcomeDiv.style.cssText = 'font-size:22px;font-weight:bold;margin-bottom:12px;letter-spacing:1px;';
        welcomeDiv.innerHTML = '👋 欢迎您的到来！';

        const timeDiv = document.createElement('div');
        timeDiv.style.marginBottom = '8px';
        timeDiv.innerHTML = '🕒 <b>时间：</b>' + (info.time || new Date().toLocaleString()) + '（' + (info.week || '') + '）';

        const locationDiv = document.createElement('div');
        locationDiv.style.marginBottom = '8px';
        locationDiv.innerHTML = '🌏 <b>地点：</b>' + (info.location || '未知') + ' &nbsp;|&nbsp; <b>IP：</b>' + (info.ip || '未知') + ' &nbsp;|&nbsp; <b>运营商：</b>' + (info.isp || '未知');

        const deviceDiv = document.createElement('div');
        deviceDiv.style.marginBottom = '8px';
        deviceDiv.innerHTML = '💻 <b>设备：</b>' + (info.system || navigator.platform) + ' &nbsp;|&nbsp; <b>浏览器：</b>' + (info.browser || navigator.userAgent.split(' ')[0]) + ' ' + (info.browser_ver || '');

        const weatherDiv = document.createElement('div');
        weatherDiv.style.marginBottom = '8px';
        const weatherText = (info.tq || '') + (info.low && info.high ? '，' + info.low + ' ~ ' + info.high : '') + (info.fl ? '，' + info.fl : '');
        weatherDiv.innerHTML = '⛅ <b>天气：</b>' + weatherText;

        const tipDiv = document.createElement('div');
        tipDiv.style.marginBottom = '8px';
        tipDiv.innerHTML = '💡 <b>天气建议：</b>' + (info.tip || '祝你每天都有好心情~');

        const greetingDiv = document.createElement('div');
        greetingDiv.style.cssText = 'margin-top:12px;font-size:16px;color:#ff8c8c;background:rgba(255,240,240,0.5);border-radius:8px;padding:8px 16px;display:inline-block;';
        greetingDiv.innerHTML = '🌸 感谢你的到访，愿你今日顺利、心情愉快！';

        // 清空容器并添加所有元素
        container.innerHTML = '';
        container.appendChild(welcomeDiv);
        container.appendChild(timeDiv);
        container.appendChild(locationDiv);
        container.appendChild(deviceDiv);
        container.appendChild(weatherDiv);
        container.appendChild(tipDiv);
        container.appendChild(greetingDiv);
    }

    // 主要逻辑
    function loadVisitorInfo() {
        // 首先尝试使用缓存数据
        const cachedWeather = getCache(CACHE_KEYS.weather);
        const cachedLocation = getCache(CACHE_KEYS.location);
        const cachedDevice = getCache(CACHE_KEYS.device);

        // 如果有完整缓存，直接显示
        if (cachedWeather && cachedLocation && cachedDevice) {
            renderVisitorInfo({
                ...cachedWeather,
                ...cachedLocation,
                ...cachedDevice,
                time: new Date().toLocaleString()
            });
            return;
        }

        // 显示加载状态
        const container = document.getElementById('visitor-info');
        if (container) {
            const loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = 'color:#888;text-align:center;';
            loadingDiv.textContent = '🔄 正在获取访客信息...';
            container.innerHTML = '';
            container.appendChild(loadingDiv);
        }

        // 获取新数据
        fetch('https://api.vvhan.com/api/visitor.info')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // 分类缓存数据
                    const weatherData = {
                        tq: data.tq,
                        low: data.low,
                        high: data.high,
                        fl: data.fl,
                        tip: data.tip
                    };

                    const locationData = {
                        location: data.location,
                        ip: data.ip,
                        isp: data.isp
                    };

                    const deviceData = {
                        system: data.system,
                        browser: data.browser,
                        browser_ver: data.browser_ver
                    };

                    // 缓存数据
                    setCache(CACHE_KEYS.weather, weatherData);
                    setCache(CACHE_KEYS.location, locationData);
                    setCache(CACHE_KEYS.device, deviceData);

                    // 渲染信息
                    renderVisitorInfo({
                        ...data,
                        time: data.time || new Date().toLocaleString(),
                        week: data.week || ''
                    });
                } else {
                    throw new Error('API返回失败');
                }
            })
            .catch(error => {
                console.warn('获取访客信息失败:', error);
                
                // 尝试使用部分缓存数据
                const fallbackInfo = {
                    time: new Date().toLocaleString(),
                    location: '未知',
                    ip: '未知',
                    system: navigator.platform,
                    browser: navigator.userAgent.split(' ')[0],
                    tq: '',
                    tip: '祝你每天都有好心情~'
                };

                // 合并可用的缓存数据
                if (cachedWeather) Object.assign(fallbackInfo, cachedWeather);
                if (cachedLocation) Object.assign(fallbackInfo, cachedLocation);
                if (cachedDevice) Object.assign(fallbackInfo, cachedDevice);

                renderVisitorInfo(fallbackInfo);

                // 如果没有任何缓存，显示简化信息
                if (!cachedWeather && !cachedLocation && !cachedDevice) {
                    const container = document.getElementById('visitor-info');
                    if (container) {
                        const errorSpan = document.createElement('span');
                        errorSpan.style.color = '#888';
                        errorSpan.textContent = '访客信息暂时不可用，但欢迎你的到来！ 🌸';
                        container.innerHTML = '';
                        container.appendChild(errorSpan);
                    }
                }
            });
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadVisitorInfo);
    } else {
        loadVisitorInfo();
    }

    // 暴露到全局（用于调试）
    window.VisitorInfo = {
        loadVisitorInfo,
        renderVisitorInfo,
        getCache,
        setCache
    };

})();
