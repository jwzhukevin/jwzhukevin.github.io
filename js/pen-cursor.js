// 鼠标变笔+彗星拖尾特效
(function() {
    // 创建笔形光标
    const penCursor = document.createElement('div');
    penCursor.id = 'pen-cursor';
    document.body.appendChild(penCursor);

    // 拖尾粒子池
    let tails = [];
    const maxTails = 18;
    document.addEventListener('mousemove', function(e) {
        // 移动笔形光标
        penCursor.style.left = (e.clientX - 6) + 'px';
        penCursor.style.top = (e.clientY - 24) + 'px';
        penCursor.style.display = 'block';

        // 创建拖尾
        const tail = document.createElement('div');
        tail.className = 'pen-tail';
        tail.style.left = (e.clientX - 2) + 'px';
        tail.style.top = (e.clientY - 2) + 'px';
        tail.style.background = 'linear-gradient(135deg, #18dcff 0%, #7d5fff 100%)';
        document.body.appendChild(tail);
        tails.push(tail);
        setTimeout(() => {
            tail.style.opacity = 0;
            tail.style.transform = 'scale(0.5)';
        }, 10);
        setTimeout(() => {
            tail.remove();
            tails.shift();
        }, 400);
        // 限制拖尾数量
        if (tails.length > maxTails) {
            tails[0].remove();
            tails.shift();
        }
    });
    // 隐藏系统鼠标
    document.body.style.cursor = 'none';
})();
// 注释：
// 1. 鼠标变为笔形，随鼠标移动。
// 2. 拖尾为蓝紫色渐变，带有彗星效果。
// 3. 仅PC端显示，移动端不影响原生体验。 