class Game {
    constructor(socket) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dino = new Dinosaur(50, GAME_CONFIG.GROUND_Y);
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = GAME_CONFIG.GAME_SPEED;
        this.isRunning = false;
        this.gameOver = false;

        this.keys = {};
        this.socket = socket;
        this.otherPlayers = {}; // Estado de jugadores remotos

        this.setupSocketListeners();
        
        this.setupEventListeners();
        this.gameLoop();

        this.updateHUD();
    }

    setupSocketListeners() {
        this.socket.on('currentPlayers', (players) => {
            Object.keys(players).forEach(id => {
                if (id !== this.socket.id) {
                    this.otherPlayers[id] = players[id];
                }
            });
        });
    
        this.socket.on('newPlayer', (player) => {
            this.otherPlayers[player.id] = player;
        });
    
        this.socket.on('playerMoved', (player) => {
            if (this.otherPlayers[player.id]) {
                this.otherPlayers[player.id].x = player.x;
                this.otherPlayers[player.id].y = player.y;
            }
        });
    
        this.socket.on('playerDisconnected', (id) => {
            delete this.otherPlayers[id];
        });
    
        this.socket.on('playerDied', ({ id }) => {
            if (this.otherPlayers[id]) {
                this.otherPlayers[id].alive = false;
            }
        });
    
        // ⬇️ Nuevo evento para iniciar juego desde el servidor
        this.socket.on('startGame', () => {
            const waitingDiv = document.getElementById('waiting-message');
            if (waitingDiv) waitingDiv.style.display = 'none'; // ⬅️ Oculta el mensaje
            this.startGame();
        });
        this.socket.on('newObstacle', (obstacleData) => {
            const obstacle = new Obstacle(obstacleData.x, obstacleData.y);
            obstacle.id = obstacleData.id;
            this.obstacles.push(obstacle);
        });
        this.socket.on('updateScoreboard', (players) => {
            this.updateScoreboard(players);
        });
        this.socket.on('restartGame', (players) => {
            // Reinicia jugador local
            this.dino = new Dinosaur(50, GAME_CONFIG.GROUND_Y);
            this.obstacles = [];
            this.score = 0;
            this.gameSpeed = GAME_CONFIG.GAME_SPEED;
            this.gameOver = false;
            this.isRunning = false;
            this.otherPlayers = players;
        
            document.querySelector('.game-over').classList.add('hidden');
            document.querySelector('.instructions').style.opacity = '1';
        
            // Opcional: mensaje visual de reinicio
            const msg = document.getElementById('waiting-message');
            if (msg) {
                msg.textContent = 'Reiniciando juego...';
                msg.style.display = 'block';
            }
        
            setTimeout(() => {
                if (msg) msg.style.display = 'none';
                this.startGame();
            }, 500); // pequeño retraso visual
        });
        
    }
    
    sendPlayerMovement() {
        if (!this.gameOver) {
            this.socket.emit('playerMovement', {
                x: this.dino.x,
                y: this.dino.y
            });
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space') {
                e.preventDefault();
                /**
                if (!this.isRunning && !this.gameOver) {
                    this.startGame();
                } else */ if (!this.gameOver) {
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
/* 
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });
*/
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


    update() {
        if (!this.isRunning || this.gameOver) return;
    
        this.dino.update();
    
        this.obstacles.forEach(obstacle => {
            obstacle.update();
            obstacle.speed = this.gameSpeed;
        });
    
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.isOffScreen());
        this.checkCollisions();
    
        this.score += 0.1;
        this.gameSpeed = GAME_CONFIG.GAME_SPEED + (this.score * 0.001);
        this.socket.emit('updateScore', this.score);
        this.updateHUD();
        this.sendPlayerMovement();
    }
    
    updateScoreboard(players) {
        const container = document.getElementById('scoreboard');
        const entries = Object.values(players)
            .sort((a, b) => b.score - a.score)
            .map(player => {
                const isYou = player.id === this.socket.id;
                return `<div style="color: ${player.color}; font-weight: ${isYou ? 'bold' : 'normal'}">
                    ${isYou ? 'Tú' : 'Jugador'}: ${Math.floor(player.score)}
                </div>`;
            })
            .join('');
        container.innerHTML = `<strong>Marcador</strong>${entries}`;
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
        Utils.saveHighScore(Math.floor(this.score));
        document.getElementById('final-score').textContent = Utils.formatScore(Math.floor(this.score));
        document.querySelector('.game-over').classList.remove('hidden');
        document.querySelector('.instructions').style.opacity = '1';
        this.updateHUD();
    
        // Notificar al servidor que el jugador murió
        this.socket.emit('playerDied');
    }

    updateHUD() {
        document.getElementById('current-score').textContent = Utils.formatScore(Math.floor(this.score));
        document.getElementById('high-score').textContent = Utils.formatScore(Utils.getHighScore());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#535353';
        this.ctx.fillRect(0, GAME_CONFIG.GROUND_Y + GAME_CONFIG.DINO_HEIGHT, this.canvas.width, 2);

        // Dibujar tu dinosaurio
        this.dino.draw(this.ctx);

        // Dibujar obstáculos
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));

     

        if (!this.isRunning && !this.gameOver) {
            this.ctx.fillStyle = '#535353';
            this.ctx.font = '16px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Presiona ESPACIO para empezar', this.canvas.width / 2, 50);
        }
        Object.values(this.otherPlayers).forEach(player => {
            if (player.alive === false) {
                // Dibujar el dinosaurio muerto (ejemplo con color rojo)
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(player.x  , player.y, GAME_CONFIG.DINO_WIDTH, GAME_CONFIG.DINO_HEIGHT);
                this.ctx.fillRect(player.x + 25 , player.y + 10, 4, 4);
            } else {
                this.ctx.fillStyle = player.color;
                this.ctx.fillRect(player.x , player.y, GAME_CONFIG.DINO_WIDTH, GAME_CONFIG.DINO_HEIGHT);
                this.ctx.fillRect(player.x + 25, player.y + 10, 4, 4);
            }
           
        });
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Inicializar juego y conectar socket
window.addEventListener('load', () => {
    // Ajusta la URL del servidor si no está en localhost:3000
    const socket = io('http://localhost:3000');
    new Game(socket);
});
