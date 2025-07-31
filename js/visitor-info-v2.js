/*!
 * 访客信息系统 V2 - 多API备用实现
 * 功能：时间、设备、地理位置、天气信息获取
 * 特点：多API备用、智能缓存、优雅降级
 */
(function() {
    'use strict';

    // 配置常量
    const CONFIG = {
        // 缓存时长（毫秒）
        CACHE_DURATION: {
            location: 60 * 60 * 1000,      // 地理位置：1小时
            weather: 30 * 60 * 1000,       // 天气：30分钟
            device: 30 * 24 * 60 * 60 * 1000 // 设备：30天
        },
        
        // 时间更新间隔
        TIME_UPDATE_INTERVAL: 10 * 60 * 1000, // 10分钟
        
        // API配置
        APIS: {
            ip: [
                'https://api.ip.sb/ip',
                'https://ipinfo.io/ip',
                'https://api.ipify.org',
                'https://httpbin.org/ip'
            ],
            location: [
                'https://ip-api.com/json/',
                'https://ipapi.co/{ip}/json/',
                'https://ipinfo.io/{ip}/json'
            ],
            weather: [
                'https://wttr.in/{city}?format=j1&lang=zh'
            ]
        }
    };

    // 缓存管理
    const Cache = {
        get(key) {
            try {
                const item = localStorage.getItem(`visitor_${key}`);
                if (!item) return null;
                
                const data = JSON.parse(item);
                const now = Date.now();
                
                if (now - data.timestamp > CONFIG.CACHE_DURATION[key]) {
                    localStorage.removeItem(`visitor_${key}`);
                    return null;
                }
                
                return data.value;
            } catch (e) {
                return null;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(`visitor_${key}`, JSON.stringify({
                    value: value,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('缓存设置失败:', e);
            }
        }
    };

    // 多API请求工具
    const APIRequest = {
        async fetchWithFallback(urls, options = {}) {
            for (let i = 0; i < urls.length; i++) {
                try {
                    const response = await fetch(urls[i], {
                        timeout: 5000,
                        ...options
                    });
                    
                    if (response.ok) {
                        return response;
                    }
                } catch (error) {
                    console.warn(`API ${i + 1} 失败:`, urls[i], error);
                    if (i === urls.length - 1) {
                        throw new Error('所有API都失败了');
                    }
                }
            }
        }
    };

    // 时间模块
    const TimeModule = {
        getCurrentTime() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hour = String(now.getHours()).padStart(2, '0');
            const minute = String(now.getMinutes()).padStart(2, '0');
            const second = String(now.getSeconds()).padStart(2, '0');
            
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const weekday = weekdays[now.getDay()];
            
            return `${year}-${month}-${day} ${hour}:${minute}:${second} (${weekday})`;
        },
        
        startTimeUpdater(callback) {
            // 立即执行一次
            callback(this.getCurrentTime());
            
            // 每10分钟更新一次
            setInterval(() => {
                callback(this.getCurrentTime());
            }, CONFIG.TIME_UPDATE_INTERVAL);
        }
    };

    // 设备检测模块
    const DeviceModule = {
        getDeviceInfo() {
            const cached = Cache.get('device');
            if (cached) return Promise.resolve(cached);
            
            const ua = navigator.userAgent;
            let os = 'Unknown OS';
            let browser = 'Unknown Browser';
            
            // 检测操作系统
            if (ua.includes('Windows NT 10.0')) os = 'Windows 11';
            else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
            else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
            else if (ua.includes('Windows')) os = 'Windows';
            else if (ua.includes('Mac OS X')) os = 'macOS';
            else if (ua.includes('Linux')) os = 'Linux';
            else if (ua.includes('Android')) os = 'Android';
            else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
            
            // 检测浏览器
            if (ua.includes('Chrome') && !ua.includes('Edge')) {
                const match = ua.match(/Chrome\/(\d+)/);
                browser = match ? `Chrome ${match[1]}` : 'Chrome';
            } else if (ua.includes('Firefox')) {
                const match = ua.match(/Firefox\/(\d+)/);
                browser = match ? `Firefox ${match[1]}` : 'Firefox';
            } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
                browser = 'Safari';
            } else if (ua.includes('Edge')) {
                const match = ua.match(/Edge\/(\d+)/);
                browser = match ? `Edge ${match[1]}` : 'Edge';
            }
            
            // 获取屏幕分辨率
            const resolution = `${screen.width}x${screen.height}`;
            
            const deviceInfo = {
                os,
                browser,
                resolution,
                language: navigator.language || 'zh-CN'
            };
            
            Cache.set('device', deviceInfo);
            return Promise.resolve(deviceInfo);
        }
    };

    // IP获取模块
    const IPModule = {
        async getIP() {
            try {
                const response = await APIRequest.fetchWithFallback(CONFIG.APIS.ip);
                const data = await response.text();
                
                // 处理不同API的响应格式
                if (data.includes('{')) {
                    const json = JSON.parse(data);
                    return json.ip || json.origin?.split(',')[0]?.trim();
                }
                
                return data.trim().replace(/"/g, '');
            } catch (error) {
                console.warn('IP获取失败:', error);
                return null;
            }
        }
    };

    // 地理位置模块
    const LocationModule = {
        async getLocation(ip) {
            const cached = Cache.get('location');
            if (cached) return cached;
            
            try {
                const urls = CONFIG.APIS.location.map(url => 
                    url.replace('{ip}', ip || '')
                );
                
                const response = await APIRequest.fetchWithFallback(urls);
                const data = await response.json();
                
                let locationInfo = {};
                
                // 处理ip-api.com响应
                if (data.country && data.regionName) {
                    locationInfo = {
                        country: data.country,
                        region: data.regionName,
                        city: data.city,
                        district: data.district || '',
                        isp: data.isp || data.org || '未知运营商'
                    };
                }
                // 处理ipapi.co响应
                else if (data.country_name && data.region) {
                    locationInfo = {
                        country: data.country_name,
                        region: data.region,
                        city: data.city,
                        district: '',
                        isp: data.org || '未知运营商'
                    };
                }
                // 处理ipinfo.io响应
                else if (data.country && data.region) {
                    locationInfo = {
                        country: data.country,
                        region: data.region,
                        city: data.city,
                        district: '',
                        isp: data.org || '未知运营商'
                    };
                }
                
                Cache.set('location', locationInfo);
                return locationInfo;
            } catch (error) {
                console.warn('地理位置获取失败:', error);
                return null;
            }
        }
    };

    // 天气模块
    const WeatherModule = {
        async getWeather(city) {
            const cached = Cache.get('weather');
            if (cached) return cached;
            
            if (!city) return null;
            
            try {
                const url = CONFIG.APIS.weather[0].replace('{city}', encodeURIComponent(city));
                const response = await fetch(url);
                
                if (!response.ok) throw new Error('天气API请求失败');
                
                const data = await response.json();
                const current = data.current_condition?.[0];
                const today = data.weather?.[0];
                
                if (!current || !today) return null;
                
                const weatherInfo = {
                    condition: current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value || '未知',
                    temp: current.temp_C + '°C',
                    humidity: current.humidity + '%',
                    windSpeed: current.windspeedKmph + 'km/h',
                    maxTemp: today.maxtempC + '°C',
                    minTemp: today.mintempC + '°C'
                };
                
                Cache.set('weather', weatherInfo);
                return weatherInfo;
            } catch (error) {
                console.warn('天气获取失败:', error);
                return null;
            }
        }
    };

    // UI渲染模块
    const UIModule = {
        showLoading() {
            const container = document.getElementById('visitor-info');
            if (!container) return;
            
            container.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    color: #666;
                ">
                    <div style="
                        width: 20px;
                        height: 20px;
                        border: 2px solid #ddd;
                        border-top: 2px solid #007acc;
                        border-radius: 50%;
                        animation: pulse 1.5s ease-in-out infinite;
                        margin-right: 10px;
                    "></div>
                    <span style="animation: pulse 1.5s ease-in-out infinite;">正在获取访客信息...</span>
                </div>
                <style>
                    @keyframes pulse {
                        0%, 100% { opacity: 0.6; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.05); }
                    }
                </style>
            `;
        },
        
        showInfo(data) {
            const container = document.getElementById('visitor-info');
            if (!container) return;
            
            const { time, device, location, weather, ip } = data;
            
            // 构建地理位置字符串
            let locationStr = '未知';
            if (location) {
                const parts = [location.country, location.region, location.city, location.district].filter(Boolean);
                locationStr = parts.join(' ');
            }
            
            // 构建天气信息
            let weatherStr = '';
            if (weather) {
                weatherStr = `
                    <div style='margin-bottom:8px;'>🌤️ <b>天气：</b>${weather.condition} ${weather.temp} (${weather.minTemp}~${weather.maxTemp})</div>
                    <div style='margin-bottom:8px;'>💨 <b>湿度：</b>${weather.humidity} | <b>风速：</b>${weather.windSpeed}</div>
                `;
            }
            
            container.innerHTML = `
                <div style='font-size:22px;font-weight:bold;margin-bottom:12px;letter-spacing:1px;'>👋 欢迎您的到来！</div>
                <div style='margin-bottom:8px;'>🕒 <b>时间：</b><span id="current-time">${time}</span></div>
                <div style='margin-bottom:8px;'>🌍 <b>地点：</b>${locationStr} | <b>IP：</b>${ip || '未知'} | <b>运营商：</b>${location?.isp || '未知'}</div>
                <div style='margin-bottom:8px;'>💻 <b>设备：</b>${device?.os || 'Unknown'} | ${device?.browser || 'Unknown'} | ${device?.resolution || ''}</div>
                ${weatherStr}
                <div style='margin-top:12px;font-size:16px;color:#ff8c8c;background:rgba(255,240,240,0.5);border-radius:8px;padding:8px 16px;display:inline-block;'>🌸 感谢你的到访，愿你今日顺利、心情愉快！</div>
                <div style='margin-top:8px;font-size:11px;color:#999;cursor:help;' title='本站收集的信息仅用于显示访客统计，不会存储或用于其他用途。所有信息均为公开可获取的网络信息。'>ℹ️ 隐私说明</div>
            `;
        },
        
        showFallback(time, device) {
            const container = document.getElementById('visitor-info');
            if (!container) return;
            
            container.innerHTML = `
                <div style='font-size:22px;font-weight:bold;margin-bottom:12px;letter-spacing:1px;'>👋 欢迎您的到来！</div>
                <div style='margin-bottom:8px;'>🕒 <b>时间：</b><span id="current-time">${time}</span></div>
                <div style='margin-bottom:8px;'>🌍 <b>地点：</b>未知 | <b>设备：</b>${device?.os || 'Unknown'} ${device?.browser || 'Unknown'}</div>
                <div style='margin-top:12px;font-size:16px;color:#ff8c8c;background:rgba(255,240,240,0.5);border-radius:8px;padding:8px 16px;display:inline-block;'>💡 感谢您的访问！</div>
                <div style='margin-top:8px;font-size:11px;color:#999;cursor:help;' title='本站收集的信息仅用于显示访客统计，不会存储或用于其他用途。'>ℹ️ 隐私说明</div>
            `;
        }
    };

    // 主控制器
    const VisitorInfo = {
        async init() {
            UIModule.showLoading();
            
            try {
                // 获取设备信息（同步，有缓存）
                const device = await DeviceModule.getDeviceInfo();
                
                // 获取IP地址
                const ip = await IPModule.getIP();
                
                // 获取地理位置信息
                const location = await LocationModule.getLocation(ip);
                
                // 获取天气信息
                const weather = location?.city ? await WeatherModule.getWeather(location.city) : null;
                
                // 启动时间更新器
                TimeModule.startTimeUpdater((time) => {
                    const timeElement = document.getElementById('current-time');
                    if (timeElement) {
                        timeElement.textContent = time;
                    }
                });
                
                // 显示完整信息
                const currentTime = TimeModule.getCurrentTime();
                UIModule.showInfo({
                    time: currentTime,
                    device,
                    location,
                    weather,
                    ip
                });
                
            } catch (error) {
                console.warn('访客信息获取失败:', error);
                
                // 降级显示
                const device = await DeviceModule.getDeviceInfo();
                const currentTime = TimeModule.getCurrentTime();
                
                UIModule.showFallback(currentTime, device);
                
                // 启动时间更新器
                TimeModule.startTimeUpdater((time) => {
                    const timeElement = document.getElementById('current-time');
                    if (timeElement) {
                        timeElement.textContent = time;
                    }
                });
            }
        }
    };

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VisitorInfo.init());
    } else {
        VisitorInfo.init();
    }

    // 暴露到全局（调试用）
    window.VisitorInfoV2 = VisitorInfo;

})();
