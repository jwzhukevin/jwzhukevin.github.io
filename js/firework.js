// Firework click effect + 爆炸四散+重力+线性淡出 + 性能优化
(function() {
    document.addEventListener('click', function (e) {
        const colors = ['#ff5252', '#ffb142', '#fffa65', '#32ff7e', '#18dcff', '#7d5fff', '#cd84f1'];
        const particles = 18; // 烟花粒子数，适当减少提升性能
        const angleStep = (2 * Math.PI) / particles;
        const gravity = 0.36; // 重力加速度
        const life = 72; // 粒子生命周期，适当缩短提升性能
        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            document.body.appendChild(particle);
            const angle = i * angleStep;
            const speed = 5 + Math.random() * 2.5;
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            let x = e.clientX;
            let y = e.clientY;
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            let t = 0;
            function animate() {
                t++;
                vy += gravity; // 重力加速度
                x += vx;
                y += vy;
                particle.style.transform = `translate(${x - e.clientX}px, ${y - e.clientY}px) scale(0.7)`;
                // 线性淡出
                let op = 1 - t / life;
                particle.style.opacity = op > 0 ? op : 0;
                if (t < life) {
                    requestAnimationFrame(animate);
                } else {
                    if (particle.parentNode) particle.parentNode.removeChild(particle);
                }
            }
            setTimeout(animate, 10);
        }
    });
})();
// 注释：
// 1. 烟花粒子爆炸后四散，受重力影响加速下落。
// 2. 粒子运动过程中透明度线性减小，直到消失。
// 3. 颜色、数量、速度均有随机性。
// 4. 彻底移除拖尾，减少DOM操作，提升性能，避免卡顿。 