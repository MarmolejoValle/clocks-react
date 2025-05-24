class Obstacle {
    constructor(x, y, type = 'cactus') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = GAME_CONFIG.CACTUS_WIDTH;
        this.height = GAME_CONFIG.CACTUS_HEIGHT;
        this.speed = GAME_CONFIG.GAME_SPEED;
    }
    
    update() {
        this.x -= this.speed;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#535353';
        
        if (this.type === 'cactus') {
            // Dibujar cactus simple
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Brazos del cactus
            ctx.fillRect(this.x - 5, this.y + 10, 8, 15);
            ctx.fillRect(this.x + this.width - 3, this.y + 8, 8, 12);
        }
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    isOffScreen() {
        return this.x + this.width < 0;
    }
}