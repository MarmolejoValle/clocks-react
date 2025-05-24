// Utilidades generales del juego
class Utils {
    static getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    static formatScore(score) {
        return score.toString().padStart(5, '0');
    }
    
    static saveHighScore(score) {
        const currentHigh = this.getHighScore();
        if (score > currentHigh) {
            localStorage.setItem('dinoHighScore', score.toString());
            return true;
        }
        return false;
    }
    
    static getHighScore() {
        return parseInt(localStorage.getItem('dinoHighScore') || '0');
    }
}

// Constantes del juego
const GAME_CONFIG = {
    GRAVITY: 0.6,
    JUMP_FORCE: -12,
    GROUND_Y: 150,
    GAME_SPEED: 4,
    SPAWN_RATE: 0.02,
    DINO_WIDTH: 44,
    DINO_HEIGHT: 47,
    CACTUS_WIDTH: 17,
    CACTUS_HEIGHT: 35
};