/*!
 * 访客信息显示组件 - 简化版本
 * 功能：显示访客的地理位置、设备信息、天气等
 * 特点：直接API调用，无缓存
 */
(function() {
    'use strict';

    // 渲染访客信息
    function renderVisitorInfo(info) {
        const container = document.getElementById('visitor-info');
        if (!container) return;

        container.innerHTML = `
            <div style='font-size:22px;font-weight:bold;margin-bottom:12px;letter-spacing:1px;'>👋 欢迎您的到来！</div>
            <div style='margin-bottom:8px;'>🕒 <b>时间：</b>${info.time || new Date().toLocaleString()}（${info.week || ''}）</div>
            <div style='margin-bottom:8px;'>🌏 <b>地点：</b>${info.location || '未知'} &nbsp;|&nbsp; <b>IP：</b>${info.ip || '未知'} &nbsp;|&nbsp; <b>运营商：</b>${info.isp || '未知'}</div>
            <div style='margin-bottom:8px;'>💻 <b>设备：</b>${info.system || navigator.platform} &nbsp;|&nbsp; <b>浏览器：</b>${info.browser || navigator.userAgent.split(' ')[0]} ${info.browser_ver || ''}</div>
            <div style='margin-bottom:8px;'>⛅ <b>天气：</b>${info.tq || ''}${info.low && info.high ? '，' + info.low + ' ~ ' + info.high : ''}${info.fl ? '，' + info.fl : ''}</div>
            <div style='margin-bottom:8px;'>💡 <b>天气建议：</b>${info.tip || '祝你每天都有好心情~'}</div>
            <div style='margin-top:12px;font-size:16px;color:#ff8c8c;background:rgba(255,240,240,0.5);border-radius:8px;padding:8px 16px;display:inline-block;'>🌸 感谢你的到访，愿你今日顺利、心情愉快！</div>
        `;
    }

    // 主要逻辑 - 直接获取
    function loadVisitorInfo() {
        fetch('https://api.vvhan.com/api/visitor.info')
            .then(res => res.json())
            .then(data => {
                renderVisitorInfo(data);
            })
            .catch(error => {
                document.getElementById('visitor-info').innerHTML = '访客信息获取失败';
            });
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadVisitorInfo);
    } else {
        loadVisitorInfo();
    }

})();
