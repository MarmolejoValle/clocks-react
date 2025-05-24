class Dinosaur {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.DINO_WIDTH;
        this.height = GAME_CONFIG.DINO_HEIGHT;
        this.velocityY = 0;
        this.onGround = true;
        this.ducking = false;
        this.animationFrame = 0;
        this.animationSpeed = 0.2;
    }
    
    jump() {
        if (this.onGround) {
            this.velocityY = GAME_CONFIG.JUMP_FORCE;
            this.onGround = false;
        }
    }
    
    duck() {
        if (this.onGround) {
            this.ducking = true;
            this.height = GAME_CONFIG.DINO_HEIGHT * 0.6;
        }
    }
    
    stopDucking() {
        this.ducking = false;
        this.height = GAME_CONFIG.DINO_HEIGHT;
    }
    
    update() {
        // Aplicar gravedad
        if (!this.onGround) {
            this.velocityY += GAME_CONFIG.GRAVITY;
            this.y += this.velocityY;
        }
        
        // Verificar si está en el suelo
        if (this.y >= GAME_CONFIG.GROUND_Y) {
            this.y = GAME_CONFIG.GROUND_Y;
            this.velocityY = 0;
            this.onGround = true;
        }
        
        // Actualizar animación
        this.animationFrame += this.animationSpeed;
    }
    
    draw(ctx) {
        // Dibujar dinosaurio (rectángulo simple por ahora)
        ctx.fillStyle = '#535353';
        
        if (this.ducking) {
            // Dinosaurio agachado
            ctx.fillRect(this.x, this.y + 15, this.width, this.height);
        } else {
            // Dinosaurio normal
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Dibujar ojos
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 25, this.y + 10, 4, 4);
        
        // Animación de piernas (si está corriendo en el suelo)
        if (this.onGround && !this.ducking) {
            ctx.fillStyle = '#535353';
            const legOffset = Math.sin(this.animationFrame) * 2;
            ctx.fillRect(this.x + 15, this.y + this.height, 8, 10 + legOffset);
            ctx.fillRect(this.x + 25, this.y + this.height, 8, 10 - legOffset);
        }
    }
    
    getBounds() {
        return {
            x: this.x + 5,
            y: this.y + 5,
            width: this.width - 10,
            height: this.height - 10
        };
    }
}