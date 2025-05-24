const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const GAME_CONFIG = require('./gameconfig');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});



let players = {};
let gameStarted = false; // ⬅️ Nuevo estado
function getRandomSoftColor() {
    const hue = Math.floor(Math.random() * 360); // Rango completo de colores
    return `hsla(${hue}, 40%, 70%, 0.6)`; // Suave (baja saturación), claro (alta luminosidad), translúcido
}
function createObstacle() {
    const x = 800; // posición inicial fuera del canvas
    const y = GAME_CONFIG.GROUND_Y + GAME_CONFIG.DINO_HEIGHT - GAME_CONFIG.CACTUS_HEIGHT;
    return { id: Date.now(), x, y };
}
io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        x: 50,
        y: GAME_CONFIG.GROUND_Y, // Si GAME_CONFIG no está aquí, usa 100 por ejemplo
        alive: true,
        score: 0,
        color: getRandomSoftColor()
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Si hay al menos 2 jugadores y el juego no ha empezado, iniciar
    if (Object.keys(players).length >= 2 && !gameStarted) {
        gameStarted = true;
        setTimeout(() => {
            io.emit('startGame'); // ⬅️ Todos empiezan al mismo tiempo
        }, 2000); // Espera 2 segundos antes de comenzar
    }
    socket.on('updateScore', (score) => {
        if (players[socket.id]) {
            players[socket.id].score = score;
            io.emit('updateScoreboard', players);
        }
    });
    socket.on('playerDied', () => {
        if (players[socket.id]) {
            players[socket.id].alive = false;
            io.emit('playerDied', { id: socket.id });
            
            // Verificar si todos están muertos
            const allDead = Object.values(players).every(player => !player.alive);
            if (allDead) {
                console.log('Todos los jugadores están muertos. Reiniciando en 2 segundos...');
                setTimeout(() => {
                    // Reiniciar estado de jugadores
                    for (let id in players) {
                        players[id].x = 50;
                        players[id].y = GAME_CONFIG.GROUND_Y; // O usa un valor fijo si GAME_CONFIG no está en el servidor
                        players[id].alive = true;
                    }
    
                    io.emit('restartGame', players); // Envía estado inicial de nuevo
                }, 2000);
            }
        }
    });

    socket.on('playerMovement', (movement) => {
        if (players[socket.id] && players[socket.id].alive) {
            players[socket.id].x = movement.x;
            players[socket.id].y = movement.y;
            io.emit('playerMoved', players[socket.id]);
        }
        else if (players[socket.id] && players[socket.id].alive == false){
            players[socket.id].x = movement.x-10;
            players[socket.id].y = movement.y;
            io.emit('playerMoved', players[socket.id]);
        }
    });
   
    
    setInterval(() => {
        const shouldSpawn = Math.random() < GAME_CONFIG.SPAWN_RATE;
        if (shouldSpawn) {
            const obstacle = createObstacle();
            io.emit('newObstacle', obstacle);
        }
    }, 300);
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);

        // Reiniciar juego si quedan menos de 2
        if (Object.keys(players).length < 2) {
            gameStarted = false;
        }
    });
    
});

server.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
});
