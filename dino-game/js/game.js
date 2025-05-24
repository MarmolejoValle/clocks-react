class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dino = new Dinosaur(50, GAME_CONFIG.GROUND_Y);
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = GAME_CONFIG.GAME_SPEED;
        this.isRunning = false;
        this.gameOver = false;
        
        this.keys = {};
        this.setupEventListeners();
        this.gameLoop();
        
        // Actualizar HUD inicial
        this.updateHUD();
    }
    
    setupEventListeners() {
        // Teclado
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (!this.isRunning && !this.gameOver) {
                    this.startGame();
                } else if (!this.gameOver) {
                    this.dino.jump();
                } else {
                    this.restart();
                }
            }
            
            if (e.code === 'ArrowDown' && this.isRunning && !this.gameOver) {
                this.dino.duck();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            
            if (e.code === 'ArrowDown') {
                this.dino.stopDucking();
            }
        });
        
        // Botón de reinicio
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });
        
        // Click en canvas para empezar
        this.canvas.addEventListener('click', () => {
            if (!this.isRunning && !this.gameOver) {
                this.startGame();
            } else if (this.gameOver) {
                this.restart();
            }
        });
    }
    
    startGame() {
        this.isRunning = true;
        this.gameOver = false;
        document.querySelector('.instructions').style.opacity = '0.5';
    }
    
    restart() {
        this.dino = new Dinosaur(50, GAME_CONFIG.GROUND_Y);
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = GAME_CONFIG.GAME_SPEED;
        this.isRunning = true;
        this.gameOver = false;
        
        document.querySelector('.game-over').classList.add('hidden');
        document.querySelector('.instructions').style.opacity = '0.5';
        this.updateHUD();
    }
    
    spawnObstacle() {
        if (Math.random() < GAME_CONFIG.SPAWN_RATE && this.obstacles.length < 3) {
            const obstacle = new Obstacle(
                this.canvas.width,
                GAME_CONFIG.GROUND_Y + GAME_CONFIG.DINO_HEIGHT - GAME_CONFIG.CACTUS_HEIGHT
            );
            this.obstacles.push(obstacle);
        }
    }
    
    update() {
        if (!this.isRunning || this.gameOver) return;
        
        // Actualizar dinosaurio
        this.dino.update();
        
        // Generar obstáculos
        this.spawnObstacle();
        
        // Actualizar obstáculos
        this.obstacles.forEach(obstacle => {
            obstacle.update();
            obstacle.speed = this.gameSpeed;
        });
        
        // Remover obstáculos que salieron de pantalla
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.isOffScreen());
        
        // Detectar colisiones
        this.checkCollisions();
        
        // Actualizar puntuación
        this.score += 0.1;
        
        // Aumentar velocidad gradualmente
        this.gameSpeed = GAME_CONFIG.GAME_SPEED + (this.score * 0.001);
        
        // Actualizar HUD
        this.updateHUD();
    }
    
    checkCollisions() {
        const dinoBounds = this.dino.getBounds();
        
        this.obstacles.forEach(obstacle => {
            const obstacleBounds = obstacle.getBounds();
            
            if (Utils.checkCollision(dinoBounds, obstacleBounds)) {
                this.endGame();
            }
        });
    }
    
    endGame() {
        this.gameOver = true;
        this.isRunning = false;
        
        // Guardar high score
        const isNewRecord = Utils.saveHighScore(Math.floor(this.score));
        
        // Mostrar pantalla de game over
        document.getElementById('final-score').textContent = Utils.formatScore(Math.floor(this.score));
        document.querySelector('.game-over').classList.remove('hidden');
        document.querySelector('.instructions').style.opacity = '1';
        
        this.updateHUD();
    }
    
    updateHUD() {
        document.getElementById('current-score').textContent = Utils.formatScore(Math.floor(this.score));
        document.getElementById('high-score').textContent = Utils.formatScore(Utils.getHighScore());
    }
    
    draw() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar suelo
        this.ctx.fillStyle = '#535353';
        this.ctx.fillRect(0, GAME_CONFIG.GROUND_Y + GAME_CONFIG.DINO_HEIGHT, this.canvas.width, 2);
        
        // Dibujar elementos del juego
        this.dino.draw(this.ctx);
        
        this.obstacles.forEach(obstacle => {
            obstacle.draw(this.ctx);
        });
        
        // Mensaje de inicio
        if (!this.isRunning && !this.gameOver) {
            this.ctx.fillStyle = '#535353';
            this.ctx.font = '16px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Presiona ESPACIO para empezar', this.canvas.width / 2, 50);
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Inicializar juego cuando se carga la página
window.addEventListener('load', () => {
    new Game();
});