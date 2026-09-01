class HighHighGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.state = 'start'; // start, playing, gameover, clear
        this.width = 800;
        this.height = 400;

        // W Shape Points (Symmetric)
        // 800x400 space. Center 400.
        // P1(Left Top) -> P2(Left Bottom) -> P3(Center Peak) -> P4(Right Bottom) -> P5(Right Top)
        this.pathPoints = [
            { x: 50, y: 50 },
            { x: 225, y: 350 },
            { x: 400, y: 150 },
            { x: 575, y: 350 },
            { x: 750, y: 50 }
        ];
        this.thickness = 70; // Safe path width

        this.groom = { x: 50, y: 50, color: 'black' };
        this.bride = { x: 750, y: 50, color: 'white' };

        this.voidLeft = 0;
        this.voidRight = 800;
        this.startTime = 0;
        this.playTime = 0;

        this.keys = {};
        this.bindEvents();

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    bindEvents() {
        window.addEventListener('keydown', e => {
            if (this.state === 'playing' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
            }
            this.keys[e.key] = true;
        });
        window.addEventListener('keyup', e => this.keys[e.key] = false);

        // Start on Click/Touch
        this.canvas.addEventListener('click', () => {
            if (this.state !== 'playing') this.start();
        });
        this.canvas.addEventListener('touchstart', (e) => {
            // e.preventDefault();
            if (this.state !== 'playing') this.start();
        });
    }

    start() {
        this.state = 'playing';
        this.groom = { x: 50, y: 50 };
        this.bride = { x: 750, y: 50 };
        this.startTime = Date.now();
        this.voidLeft = -100; // Start slightly off screen? User said "Left edge".
        this.voidLeft = 0;
        this.voidRight = 800;
    }

    reset() {
        this.state = 'start';
        this.voidLeft = 0;
        this.voidRight = 800;
        this.groom = { x: 50, y: 50 };
        this.bride = { x: 750, y: 50 };
    }

    update() {
        if (this.state !== 'playing') {
            // Allow restart with Space/Enter
            if (this.keys[' '] || this.keys['Enter']) this.start();
            return;
        }

        const now = Date.now();
        this.playTime = (now - this.startTime) / 1000;

        // Void Movement (55s to reach center 400)
        // VoidLeft moves 0 -> 400
        // VoidRight moves 800 -> 400
        const duration = 55;
        if (this.playTime < duration) {
            const progress = this.playTime / duration;
            this.voidLeft = progress * 400; // 0 to 400
            this.voidRight = 800 - (progress * 400); // 800 to 400
        } else {
            this.voidLeft = 400;
            this.voidRight = 400;
        }

        // Movement
        const speed = 3;

        // Groom WASD
        if (this.keys['w'] || this.keys['W']) this.groom.y -= speed;
        if (this.keys['s'] || this.keys['S']) this.groom.y += speed;
        if (this.keys['a'] || this.keys['A']) this.groom.x -= speed;
        if (this.keys['d'] || this.keys['D']) this.groom.x += speed;

        // Bride Arrows
        if (this.keys['ArrowUp']) this.bride.y -= speed;
        if (this.keys['ArrowDown']) this.bride.y += speed;
        if (this.keys['ArrowLeft']) this.bride.x -= speed;
        if (this.keys['ArrowRight']) this.bride.x += speed;

        // Bounds (Canvas Limits)
        this.clamp(this.groom);
        this.clamp(this.bride);

        // Check Death (Path)
        // If NOT safe, Die
        if (!this.isSafe(this.groom)) this.die();
        if (!this.isSafe(this.bride)) this.die();

        // Check Death (Active Void)
        // Void covers everything x < voidLeft AND x > voidRight
        // Wait, The "Black Area" moves.
        // Left Void covers [0, voidLeft]
        // Right Void covers [voidRight, 800]
        if (this.groom.x < this.voidLeft) this.die();
        if (this.bride.x > this.voidRight) this.die();

        // Check Win
        // Meet in center (Distance < 40)
        const dx = this.groom.x - this.bride.x;
        const dy = this.groom.y - this.bride.y;
        if (Math.hypot(dx, dy) < 40) {
            this.state = 'clear';
        }
    }

    clamp(p) {
        p.x = Math.max(0, Math.min(800, p.x));
        p.y = Math.max(0, Math.min(400, p.y));
    }

    isSafe(p) {
        const r = this.thickness / 2;
        // Check distance to any line segment
        for (let i = 0; i < this.pathPoints.length - 1; i++) {
            const p1 = this.pathPoints[i];
            const p2 = this.pathPoints[i + 1];
            if (this.distToSegment(p, p1, p2) <= r) return true;
        }
        return false;
    }

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    die() {
        this.state = 'gameover';
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Path (W)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = this.thickness;

        ctx.beginPath();
        this.pathPoints.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw Moving Voids (Black Rects on top)
        ctx.fillStyle = 'black';
        // Left Void
        ctx.fillRect(0, 0, this.voidLeft, this.height);
        // Right Void
        ctx.fillRect(this.voidRight, 0, this.width - this.voidRight, this.height);

        // Draw Split Line (Visual Guide)
        ctx.beginPath();
        ctx.moveTo(400, 0);
        ctx.lineTo(400, 400);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Characters
        // Groom (Black dot with White outline)
        ctx.beginPath();
        ctx.arc(this.groom.x, this.groom.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.strokeStyle = 'cyan'; // Cyan outline for Groom
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bride (White dot with Black? outline)
        ctx.beginPath();
        ctx.arc(this.bride.x, this.bride.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'magenta'; // Magenta outline for Bride
        ctx.lineWidth = 2;
        ctx.stroke();

        // Render UI Text
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';

        if (this.state === 'start') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 40px monospace';
            ctx.fillText("WEDDING PATH", 400, 150);
            ctx.font = '20px monospace';
            ctx.fillText("Left: W A S D  |  Right: Arrows", 400, 220);
            ctx.fillText("Touch or Press Space to Start", 400, 260);
        } else if (this.state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = 'red';
            ctx.font = 'bold 50px monospace';
            ctx.fillText("WEDDING OVER", 400, 150);
            ctx.fillStyle = 'white';
            ctx.font = '20px monospace';
            ctx.fillText(`Time: ${this.playTime.toFixed(2)}s`, 400, 200);
            ctx.fillText("Continue?", 400, 250);
        } else if (this.state === 'clear') {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = 'black';
            ctx.font = 'bold 40px monospace';
            ctx.fillText("Congratulations!", 400, 150);
            ctx.font = '30px monospace';
            ctx.fillText("Wedding Complete!", 400, 200);
            ctx.font = '20px monospace';
            ctx.fillText(`Time: ${this.playTime.toFixed(2)}s`, 400, 250);
        } else {
            // HUD
            ctx.font = '16px monospace';
            ctx.fillStyle = 'gray';
            ctx.fillText(this.playTime.toFixed(1), 400, 30);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}
window.HighHighGame = HighHighGame;
