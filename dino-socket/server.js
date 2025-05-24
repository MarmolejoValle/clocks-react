const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
  });
  
const PORT = 3000;
app.use(express.static('public'));

const GAME_CONFIG = {
    GROUND_Y: 150,
    DINO_WIDTH: 40,
    DINO_HEIGHT: 40,
    OBSTACLE_WIDTH: 20,
    OBSTACLE_HEIGHT: 40,
    GAME_SPEED: 6
};

let players = {};
let obstacles = [];
let gameRunning = false;
let obstacleId = 0;

function generateObstacle() {
    const x = Math.max(...Object.values(players).map(p => p.x)) + 400;
    return {
        id: obstacleId++,
        x: x,
        y: GAME_CONFIG.GROUND_Y
    };
}

function resetGame() {
    players = Object.fromEntries(
        Object.entries(players).map(([id, player]) => [
            id,
            {
                ...player,
                x: 50,
                y: GAME_CONFIG.GROUND_Y,
                vy: 0,
                isJumping: false,
                isDucking: false,
                alive: true,
                score: 0
            }
        ])
    );
    obstacles = [];
    obstacleId = 0;
    gameRunning = true;

    io.emit('restartGame', players);
}

function handleCollisions(player) {
    return obstacles.some(obstacle => {
        const dinoBottom = player.y + GAME_CONFIG.DINO_HEIGHT;
        const dinoRight = player.x + GAME_CONFIG.DINO_WIDTH;
        const obstacleBottom = obstacle.y + GAME_CONFIG.OBSTACLE_HEIGHT;
        const obstacleRight = obstacle.x + GAME_CONFIG.OBSTACLE_WIDTH;

        return (
            player.x < obstacleRight &&
            dinoRight > obstacle.x &&
            player.y < obstacleBottom &&
            dinoBottom > obstacle.y
        );
    });
}

function gameLoop() {
    if (!gameRunning) return;

    Object.values(players).forEach(player => {
        if (!player.alive) return;

        // Movimiento
        player.x += GAME_CONFIG.GAME_SPEED;
        if (player.isJumping) {
            player.vy += 0.5;
            player.y += player.vy;

            if (player.y >= GAME_CONFIG.GROUND_Y) {
                player.y = GAME_CONFIG.GROUND_Y;
                player.vy = 0;
                player.isJumping = false;
            }
        }

        // Puntuación
        player.score += 0.5;

        if (handleCollisions(player)) {
            player.alive = false;
            io.emit('playerDied', { id: player.id });
        
            const allDead = Object.values(players).every(p => !p.alive);
            if (allDead) {
                gameRunning = false;
                console.log('Todos han muerto. Reiniciando en 3 segundos...');
                setTimeout(() => {
                    Object.values(players).forEach(p => {
                        p.x = 50;
                        p.y = GAME_CONFIG.GROUND_Y;
                        p.vy = 0;
                        p.isJumping = false;
                        p.isDucking = false;
                        p.alive = true;
                        p.score = 0;
                    });
                    obstacles = [];
                    obstacleId = 0;
                    gameRunning = true;
                    io.emit('restartGame', players);
                }, 3000);
            }
        }
    });

    // Crear obstáculos
    if (Math.random() < 0.02) {
        const obstacle = generateObstacle();
        obstacles.push(obstacle);
        io.emit('newObstacle', obstacle);
    }

    // Limpiar obstáculos
    obstacles = obstacles.filter(ob => {
        return ob.x > Math.min(...Object.values(players).map(p => p.x)) - 100;
    });

    // Enviar estado
    io.emit('playerStateUpdate', players);
    io.emit('updateScoreboard', players);

    // Verificar fin del juego
    const allDead = Object.values(players).every(p => !p.alive);
    if (allDead) {
        gameRunning = false;
        console.log('Todos han perdido. Esperando reinicio...');
    }
}

setInterval(gameLoop, 1000 / 60);

// WebSocket
io.on('connection', socket => {
    const color = `hsl(${Math.random() * 360}, 70%, 60%)`;
    players[socket.id] = {
        id: socket.id,
        x: 50,
        y: GAME_CONFIG.GROUND_Y,
        vy: 0,
        isJumping: false,
        isDucking: false,
        alive: true,
        score: 0,
        color
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    console.log(`Jugador conectado: ${socket.id}`);

    if (!gameRunning && Object.keys(players).length > 1) {
        gameRunning = true;
        io.emit('startGame');
    }

    socket.on('playerInput', ({ action }) => {
        const player = players[socket.id];
        if (!player || !player.alive) return;

        if (action === 'jump' && !player.isJumping && player.y >= GAME_CONFIG.GROUND_Y) {
            player.vy = -10;
            player.isJumping = true;
        } else if (action === 'duck') {
            player.isDucking = true;
        } else if (action === 'stopDuck') {
            player.isDucking = false;
        }
    });

    socket.on('restartRequest', () => {
        console.log(`Reinicio solicitado por ${socket.id}`);
        resetGame();
    });

    socket.on('disconnect', () => {
        console.log(`Jugador desconectado: ${socket.id}`);
        delete players[socket.id];
        socket.broadcast.emit('playerDisconnected', socket.id);

        if (Object.keys(players).length === 0) {
            gameRunning = false;
            obstacles = [];
            obstacleId = 0;
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
