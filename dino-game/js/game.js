class Game {
    constructor(socket) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dino = new Dinosaur(50, GAME_CONFIG.GROUND_Y);
        this.cameraX = 0;
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = GAME_CONFIG.GAME_SPEED;
        this.isRunning = false;
        this.gameOver = false;

        this.keys = {};
        this.socket = socket;
        this.otherPlayers = {};

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
            if (player.id !== this.socket.id) {
                this.otherPlayers[player.id] = player;
            }
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

        this.socket.on('startGame', () => {
            const waitingDiv = document.getElementById('waiting-message');
            if (waitingDiv) waitingDiv.style.display = 'none';
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

        this.socket.on('playerStateUpdate', (players) => {
            if (players[this.socket.id]) {
                const self = players[this.socket.id];
                this.dino.x = self.x;
                this.dino.y = self.y;

                // Detectar si el jugador murió ahora y no lo había detectado antes
                if (this.dino.alive && !self.alive) {
                    this.endGame();
                }

                this.dino.alive = self.alive;
                this.score = self.score;
            }

            Object.entries(players).forEach(([id, data]) => {
                if (id !== this.socket.id) {
                    if (!this.otherPlayers[id]) {
                        this.otherPlayers[id] = data;
                    } else {
                        this.otherPlayers[id].x = data.x;
                        this.otherPlayers[id].y = data.y;
                        this.otherPlayers[id].alive = data.alive;
                    }
                }
            });
        });

        this.socket.on('restartGame', (players) => {
            this.dino = new Dinosaur(50, GAME_CONFIG.GROUND_Y);
            this.obstacles = [];
            this.cameraX = 0;
            this.score = 0;
            this.gameSpeed = GAME_CONFIG.GAME_SPEED;
            this.gameOver = false;
            this.isRunning = false;

            // Reconstruir otherPlayers correctamente
            this.otherPlayers = {};
            Object.entries(players).forEach(([id, data]) => {
                if (id !== this.socket.id) {
                    this.otherPlayers[id] = {
                        id,
                        x: data.x,
                        y: data.y,
                        alive: data.alive,
                        color: data.color,
                        score: data.score
                    };
                }
            });

            document.querySelector('.game-over').classList.add('hidden');
            document.querySelector('.instructions').style.opacity = '1';

            const msg = document.getElementById('waiting-message');
            if (msg) {
                msg.textContent = 'Reiniciando juego...';
                msg.style.display = 'block';
            }

            setTimeout(() => {
                if (msg) msg.style.display = 'none';
                this.startGame();
            }, 500);
        });
    }

    sendInput(action) {
        if (!this.gameOver) {
            this.socket.emit('playerInput', { action });
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                if (!this.gameOver) {
                    this.sendInput('jump');
                } else {
                    this.restart();
                }
            }
            if (e.code === 'ArrowDown' && this.isRunning && !this.gameOver) {
                this.sendInput('duck');
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ArrowDown') {
                this.sendInput('stopDuck');
            }
        });

        this.canvas.addEventListener('click', () => {
            if (!this.isRunning && !this.gameOver) {
                this.startGame();
            } else if (this.gameOver) {
                this.restart();
            }
        });
    }

    startGame() {
        this.dino.x = 50;
        this.cameraX = 0;
        this.isRunning = true;
        this.gameOver = false;
        document.querySelector('.instructions').style.opacity = '0.5';
    }

    restart() {
        this.socket.emit('restartRequest');
    }

    update() {
        if (!this.isRunning || this.gameOver) return;

        // No actualizar dino localmente porque el servidor lo controla
        this.cameraX = this.dino.x - 50;
        this.updateHUD();
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

    endGame() {
        this.gameOver = true;
        this.isRunning = false;
        Utils.saveHighScore(Math.floor(this.score));
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#535353';
        this.ctx.fillRect(0, GAME_CONFIG.GROUND_Y + GAME_CONFIG.DINO_HEIGHT, this.canvas.width, 2);

        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);

        this.dino.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));

        Object.values(this.otherPlayers).forEach(player => {
            if (player.alive === false) {
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(player.x, player.y, GAME_CONFIG.DINO_WIDTH, GAME_CONFIG.DINO_HEIGHT);
                this.ctx.fillRect(player.x + 25, player.y + 10, 4, 4);
            } else {
                this.ctx.fillStyle = player.color;
                this.ctx.fillRect(player.x, player.y, GAME_CONFIG.DINO_WIDTH, GAME_CONFIG.DINO_HEIGHT);
                this.ctx.fillRect(player.x + 25, player.y + 10, 4, 4);
            }
        });

        this.ctx.restore();

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

window.addEventListener('load', () => {
    const socket = io('http://localhost:3000');
    new Game(socket);
});
 