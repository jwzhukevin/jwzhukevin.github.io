// 星空背景+太阳/月亮随主题切换同步
(function() {
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'space-bg-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = 0;
    canvas.style.top = 0;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = 1; // header为100，内容为10+，此处1保证在背景但不覆盖导航
    canvas.style.pointerEvents = 'none';
    canvas.style.userSelect = 'none';
    // 插入到header后面，避免覆盖导航栏
    const header = document.querySelector('header, .header, #header, .site-header');
    if (header && header.parentNode) {
        header.parentNode.insertBefore(canvas, header.nextSibling);
    } else {
        document.body.prepend(canvas);
    }
    let ctx = canvas.getContext('2d');
    let stars = [];
    let w, h, dpr;
    const STAR_NUM = 120;
    const STAR_COLORS = ['#fff', '#ffe9c4', '#b5caff', '#ffd1fa'];
    function resize() {
        dpr = window.devicePixelRatio || 1;
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);
    // 生成星星
    function genStars() {
        stars = [];
        for (let i = 0; i < STAR_NUM; i++) {
            const phase = Math.random() * Math.PI * 2;
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.2 + 0.3,
                color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
                alpha: Math.random() * 0.7 + 0.3,
                twinkle: Math.random() * 0.05 + 0.01,
                phase: phase,
                speed: 0.008 + Math.random() * 0.012
            });
        }
    }
    genStars();
    window.addEventListener('resize', genStars);
    // 太阳/月亮位置（始终随时间移动）
    function getCelestialPos() {
        const now = new Date();
        const hour = now.getHours() + now.getMinutes()/60;
        let t = (hour-6)/12;
        if (t < 0) t = 0; if (t > 1) t = 1;
        let x = w * (0.1 + 0.8 * t);
        let y = h * (0.35 - 0.18*Math.sin(Math.PI*t));
        return {x, y};
    }
    // 监听body class变化，实时同步主题
    let isNight = document.body.classList.contains('dark');
    const observer = new MutationObserver(() => {
        isNight = document.body.classList.contains('dark');
    });
    observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
    // 绘制山水
    function drawMountains(night) {
        ctx.save();
        let baseY = h * 0.82;
        // 最远山（淡色，起伏最大）
        ctx.beginPath();
        ctx.moveTo(0, baseY-90);
        ctx.bezierCurveTo(w*0.10, baseY-180, w*0.25, baseY-120, w*0.38, baseY-160);
        ctx.bezierCurveTo(w*0.52, baseY-200, w*0.7, baseY-120, w, baseY-170);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.globalAlpha = night ? 0.08 : 0.13;
        ctx.fillStyle = night ? '#222' : 'rgba(180,200,220,0.25)';
        ctx.filter = night ? 'blur(4px)' : 'blur(2px)';
        ctx.fill();
        ctx.filter = 'none';
        // 远山
        ctx.beginPath();
        ctx.moveTo(0, baseY-50);
        ctx.bezierCurveTo(w*0.12, baseY-120, w*0.28, baseY-80, w*0.38, baseY-100);
        ctx.bezierCurveTo(w*0.52, baseY-140, w*0.68, baseY-80, w, baseY-110);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.globalAlpha = night ? 0.12 : 0.18;
        ctx.fillStyle = night ? '#222' : 'rgba(180,200,220,0.4)';
        ctx.filter = night ? 'blur(3px)' : 'blur(1.2px)';
        ctx.fill();
        ctx.filter = 'none';
        // 中山
        ctx.beginPath();
        ctx.moveTo(0, baseY-10);
        ctx.bezierCurveTo(w*0.18, baseY-60, w*0.32, baseY-10, w*0.5, baseY-70);
        ctx.bezierCurveTo(w*0.68, baseY-120, w*0.82, baseY-30, w, baseY-50);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.globalAlpha = night ? 0.16 : 0.28;
        ctx.fillStyle = night ? '#181818' : 'rgba(140,170,200,0.5)';
        ctx.filter = night ? 'blur(2px)' : 'blur(0.8px)';
        ctx.fill();
        ctx.filter = 'none';
        // 近山
        ctx.beginPath();
        ctx.moveTo(0, baseY+30);
        ctx.bezierCurveTo(w*0.12, baseY+10, w*0.28, baseY+60, w*0.45, baseY+20);
        ctx.bezierCurveTo(w*0.62, baseY-10, w*0.82, baseY+60, w, baseY+40);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.globalAlpha = night ? 0.22 : 0.5;
        ctx.fillStyle = night ? '#111' : 'rgba(100,140,180,0.7)';
        ctx.filter = night ? 'blur(1.5px)' : 'blur(0.3px)';
        ctx.fill();
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    // 绘制主循环
    let frame = 0;
    // ====== 流星相关变量和函数 ======
    let meteors = [];
    let meteorTimer = 0;
    // 生成一个流星对象
    function createMeteor() {
        // 起点在屏幕上方或右上方，终点在左下方
        const startX = Math.random() * w * 0.6 + w * 0.4; // 右侧偏多
        const startY = Math.random() * h * 0.2; // 上方
        const maxTailLen = 80 + Math.random() * 80; // 拖尾最大长度
        const angle = Math.PI * (0.72 + Math.random() * 0.08); // 角度大约120~130度
        const speed = 2 + Math.random() * 3; // 流星速度
        const alpha = 0.7 + Math.random() * 0.3; // 透明度
        const maxLife = 120 + Math.random() * 10; // 头部存活帧数
        const tailFade = 40 + Math.random() * 10; // 拖尾消失帧数
        meteors.push({
            x: startX,
            y: startY,
            maxTailLen, // 拖尾最大长度
            tailLen: 0,  // 当前拖尾长度
            angle,
            speed,
            alpha,
            life: 0,
            maxLife, // 头部消失时机
            tailFade, // 拖尾消失时长
            tailFadeFrame: 0 // 拖尾消失已用帧数
        });
    }
    // 绘制所有流星
    function drawMeteors() {
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            // 拖尾增长逻辑
            let growTime = m.maxLife * 0.18; // 拖尾增长时间
            // 拖尾长度随生命周期变化
            if (m.life < growTime) {
                // 拖尾从0增长到最大
                m.tailLen = m.maxTailLen * (m.life / growTime);
            } else if (m.life < m.maxLife) {
                // 拖尾保持最大
                m.tailLen = m.maxTailLen;
            } else {
                // 拖尾缩短阶段
                m.tailFadeFrame++;
                m.tailLen = m.maxTailLen * (1 - m.tailFadeFrame / m.tailFade);
                if (m.tailLen < 0) m.tailLen = 0;
            }
            // 拖尾分段
            const segs = 16;
            if (m.tailLen > 0.5) {
                // 计算头部当前半径（与头部缩小同步）
                let t = 1 - (m.life / m.maxLife);
                let headR = 3.2 * (t > 0 ? t : 0.01);
                let maxTailWidth = headR; // 拖尾最粗端宽度与头部半径一致
                for (let j = 0; j < segs; j++) {
                    let t0 = j / segs;
                    let t1 = (j+1) / segs;
                    // 拖尾当前实际长度
                    let x0 = m.x - Math.cos(m.angle) * m.tailLen * t0;
                    let y0 = m.y - Math.sin(m.angle) * m.tailLen * t0;
                    let x1 = m.x - Math.cos(m.angle) * m.tailLen * t1;
                    let y1 = m.y - Math.sin(m.angle) * m.tailLen * t1;
                    // 越远越细越透明，最粗端与头部同步
                    let width = maxTailWidth * (1-t1) + 0.2;
                    let alpha = m.alpha * (1-t1) * 0.85;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
                    ctx.lineWidth = width;
                    ctx.shadowColor = '#fff';
                    ctx.shadowBlur = 6 * (1-t1);
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                    ctx.stroke();
                    ctx.restore();
                }
            }
            // 头部星星（只在头部未消失时显示，且从出现到消失一直缩小）
            if (m.life < m.maxLife) {
                // 头部从出现到消失一直缩小
                let t = 1 - (m.life / m.maxLife); // 剩余比例
                let r = 3.2 * (t > 0 ? t : 0.01); // 最小不能为0，避免绘制异常
                ctx.save();
                ctx.globalAlpha = m.alpha;
                ctx.beginPath();
                ctx.arc(m.x, m.y, r, 0, 2*Math.PI);
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 18 * (r/3.2); // 光晕也随半径缩小
                ctx.fill();
                ctx.restore();
            }
            // 更新流星位置（头部消失后不再移动）
            if (m.life < m.maxLife) {
                m.x += Math.cos(m.angle) * m.speed;
                m.y += Math.sin(m.angle) * m.speed;
            }
            m.life++;
            // 拖尾完全消失后再移除
            if (m.life > m.maxLife && m.tailLen <= 0.5) {
                meteors.splice(i, 1);
            }
        }
    }
    // ====== 白天小麻雀相关变量和函数 ======
    let sparrows = [];
    let sparrowTimer = 0;
    let sparrowInterval = 0; // 控制两只麻雀的间隔
    let mouseX = -9999, mouseY = -9999; // 鼠标坐标
    // 监听鼠标移动，记录坐标
    window.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    // 生成一个纸飞机对象
    function createSparrow() {
        // 随机起点和终点高度
        const startY = 80 + Math.random() * (h * 0.5);
        const endY = 80 + Math.random() * (h * 0.5);
        // 随机曲线控制点（贝塞尔曲线）
        const ctrlY = 40 + Math.random() * (h * 0.7);
        const duration = 520 + Math.random() * 120; // 飞行帧数（更慢）
        sparrows.push({
            startX: w + 60,
            startY,
            endX: -60,
            endY,
            ctrlY,
            t: 0,
            duration,
            size: 28 + Math.random() * 10, // 纸飞机更大
            scared: false, // 是否受惊
            angleOffset: 0, // 被鼠标影响后的角度偏移
            vx: null, // 进入自由飞行后的速度x
            vy: null, // 进入自由飞行后的速度y
            free: false // 是否进入自由飞行
        });
    }
    // 绘制所有纸飞机
    function drawSparrows() {
        for (let i = sparrows.length - 1; i >= 0; i--) {
            const s = sparrows[i];
            let x, y, angle = 0;
            if (!s.free) {
                // 贝塞尔曲线插值，t从0到1
                let tt = s.t / s.duration;
                if (tt > 1) {
                    // 进入自由飞行
                    s.free = true;
                    // 计算当前速度分量
                    let prevT = (s.t-1)/s.duration;
                    let px = (1-prevT)*(1-prevT)*s.startX + 2*(1-prevT)*prevT*w/2 + prevT*prevT*s.endX;
                    let py = (1-prevT)*(1-prevT)*s.startY + 2*(1-prevT)*prevT*s.ctrlY + prevT*prevT*s.endY;
                    x = (1-tt)*(1-tt)*s.startX + 2*(1-tt)*tt*w/2 + tt*tt*s.endX;
                    y = (1-tt)*(1-tt)*s.startY + 2*(1-tt)*tt*s.ctrlY + tt*tt*s.endY;
                    s.vx = x - px;
                    s.vy = y - py;
                    s.x = x;
                    s.y = y;
                } else {
                    // 计算当前坐标
                    x = (1-tt)*(1-tt)*s.startX + 2*(1-tt)*tt*w/2 + tt*tt*s.endX;
                    y = (1-tt)*(1-tt)*s.startY + 2*(1-tt)*tt*s.ctrlY + tt*tt*s.endY;
                    // 互动逻辑：鼠标靠近则降低飞行角度
                    let dist = Math.sqrt((x-mouseX)*(x-mouseX)+(y-mouseY)*(y-mouseY));
                    if (dist < 120 && !s.scared) {
                        s.scared = true;
                        s.angleOffset = Math.PI/7 + Math.random()*0.15; // 俯冲角度
                    }
                    if (s.scared) {
                        angle = s.angleOffset;
                    } else {
                        angle = Math.sin(s.t/18) * 0.13;
                    }
                    ctx.save();
                    ctx.globalAlpha = 0.93;
                    ctx.translate(x, y);
                    ctx.rotate(angle);
                    let size = s.size;
                    // 纸飞机主体（头朝左）
                    ctx.beginPath();
                    ctx.moveTo(0, 0); // 头部
                    ctx.lineTo(size*0.9, -size*0.22);
                    ctx.lineTo(size*0.7, 0);
                    ctx.lineTo(size*0.9, size*0.22);
                    ctx.closePath();
                    ctx.fillStyle = '#f7f7f7';
                    ctx.shadowColor = '#bbb';
                    ctx.shadowBlur = 6;
                    ctx.fill();
                    // 纸飞机左翼
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(size*0.7, 0);
                    ctx.lineTo(size*0.9, -size*0.22);
                    ctx.lineTo(size*0.5, -size*0.08);
                    ctx.closePath();
                    ctx.fillStyle = '#e0e0e0';
                    ctx.shadowBlur = 0;
                    ctx.fill();
                    // 纸飞机右翼
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(size*0.7, 0);
                    ctx.lineTo(size*0.9, size*0.22);
                    ctx.lineTo(size*0.5, size*0.08);
                    ctx.closePath();
                    ctx.fillStyle = '#e0e0e0';
                    ctx.fill();
                    // 纸飞机中线
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(size*0.7, 0);
                    ctx.strokeStyle = '#bdbdbd';
                    ctx.lineWidth = 1.1;
                    ctx.stroke();
                    // 画"W"字logo
                    ctx.save();
                    ctx.translate(size*0.32, size*0.01);
                    ctx.scale(0.7, 0.7);
                    ctx.beginPath();
                    ctx.moveTo(-8, 0);
                    ctx.lineTo(-5, 8);
                    ctx.lineTo(-2, 0);
                    ctx.lineTo(1, 8);
                    ctx.lineTo(4, 0);
                    ctx.strokeStyle = '#3a6fd7';
                    ctx.lineWidth = 2.2;
                    ctx.shadowColor = '#fff';
                    ctx.shadowBlur = 2;
                    ctx.stroke();
                    ctx.restore();
                    ctx.restore();
                    s.t++;
                    continue;
                }
            }
            // 自由飞行阶段
            // 互动逻辑：鼠标靠近则降低飞行角度（朝下俯冲）
            let dist = Math.sqrt((s.x-mouseX)*(s.x-mouseX)+(s.y-mouseY)*(s.y-mouseY));
            if (dist < 120 && !s.scared) {
                s.scared = true;
                // 俯冲角度（朝下）
                let speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
                let angle = Math.atan2(s.vy, s.vx) + (Math.PI/7 + Math.random()*0.15); // 负号，朝下偏移
                s.vx = Math.cos(angle) * speed;
                s.vy = Math.sin(angle) * speed;
            }
            // 模拟重力影响（vy逐步增加）
            s.vy += 0.018; // 重力加速度
            // 更新位置，速度整体放慢
            let speedScale = 0.52; // 飞行速度整体放慢
            s.x += s.vx * speedScale;
            s.y += s.vy * speedScale;
            // 画纸飞机
            ctx.save();
            ctx.globalAlpha = 0.93;
            ctx.translate(s.x, s.y);
            ctx.rotate(Math.atan2(s.vy, s.vx));
            let size = s.size;
            // 纸飞机主体（头朝左）
            ctx.beginPath();
            ctx.moveTo(0, 0); // 头部
            ctx.lineTo(size*0.9, -size*0.22);
            ctx.lineTo(size*0.7, 0);
            ctx.lineTo(size*0.9, size*0.22);
            ctx.closePath();
            ctx.fillStyle = '#f7f7f7';
            ctx.shadowColor = '#bbb';
            ctx.shadowBlur = 6;
            ctx.fill();
            // 纸飞机左翼
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size*0.7, 0);
            ctx.lineTo(size*0.9, -size*0.22);
            ctx.lineTo(size*0.5, -size*0.08);
            ctx.closePath();
            ctx.fillStyle = '#e0e0e0';
            ctx.shadowBlur = 0;
            ctx.fill();
            // 纸飞机右翼
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size*0.7, 0);
            ctx.lineTo(size*0.9, size*0.22);
            ctx.lineTo(size*0.5, size*0.08);
            ctx.closePath();
            ctx.fillStyle = '#e0e0e0';
            ctx.fill();
            // 纸飞机中线
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size*0.7, 0);
            ctx.strokeStyle = '#bdbdbd';
            ctx.lineWidth = 1.1;
            ctx.stroke();
            // 画"W"字logo
            ctx.save();
            ctx.translate(size*0.32, size*0.01);
            ctx.scale(0.7, 0.7);
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(-5, 8);
            ctx.lineTo(-2, 0);
            ctx.lineTo(1, 8);
            ctx.lineTo(4, 0);
            ctx.strokeStyle = '#3a6fd7';
            ctx.lineWidth = 2.2;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 2;
            ctx.stroke();
            ctx.restore();
            ctx.restore();
            // 飞出屏幕则移除
            if (s.x < -100 || s.y < -100 || s.y > h + 100) {
                sparrows.splice(i, 1);
            }
        }
    }
    function draw() {
        ctx.clearRect(0,0,w,h);
        // 只在夜间绘制星星和月亮
        if (isNight) {
            frame++;
            // ====== 流星生成逻辑 ======
            meteorTimer++;
            // 每隔60~180帧随机生成一颗流星（约1~3秒一颗）
            if (meteorTimer > 300 + Math.random() * 600) {
                createMeteor();
                meteorTimer = 0;
            }
            drawMeteors(); // 绘制流星
            // ====== 星星和月亮 ======
            for (let s of stars) {
                // 呼吸式闪烁
                s.phase += s.speed;
                let twinkleAlpha = 0.6 + 0.4 * Math.sin(s.phase);
                ctx.globalAlpha = s.alpha * twinkleAlpha;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, 2*Math.PI);
                ctx.fillStyle = s.color;
                ctx.shadowColor = s.color;
                ctx.shadowBlur = 8;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            // 月亮
            const moon = getCelestialPos();
            ctx.save();
            ctx.beginPath();
            ctx.arc(moon.x, moon.y, 32, 0, 2*Math.PI);
            ctx.fillStyle = 'rgba(255,255,220,0.92)';
            ctx.shadowColor = '#fffbe6';
            ctx.shadowBlur = 30;
            ctx.fill();
            // 月牙效果
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(moon.x+12, moon.y-8, 28, 0, 2*Math.PI);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
            // 夜间山体阴影
            drawMountains(true);
        } else {
            // 白天只绘制太阳和山水
            const sun = getCelestialPos();
            ctx.save();
            ctx.beginPath();
            ctx.arc(sun.x, sun.y, 38, 0, 2*Math.PI);
            ctx.fillStyle = 'rgba(255, 220, 80, 0.95)';
            ctx.shadowColor = '#ffe066';
            ctx.shadowBlur = 40;
            ctx.fill();
            ctx.restore();
            // 白天山水
            drawMountains(false);
            // ====== 白天纸飞机逻辑 ======
            sparrowTimer++;
            // 每隔600帧（10秒）生成一只纸飞机
            if (sparrowTimer > 600) {
                createSparrow();
                sparrowTimer = 0;
            }
            drawSparrows();
        }
        requestAnimationFrame(draw);
    }
    draw();
})(); 