const Player = require('./Player');

class Room {
    constructor(code) {
        this.code = code;
        this.players = new Map();  // Store player objects
        this.maxPlayers = 8;
        this.minPlayers = 2;
        this.gameStarted = false;
        this.spikeSpeed = 1;  // Initial speed multiplier
        this.currentSpike = null;
        this.lastSpikeDirection = null;
    }

    // Add a new player to the room
    addPlayer(id, avatar) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        const player = new Player(id, avatar);
        player.position = {
            x: Math.random() * 700 + 50, // Random x between 50 and 750
            y: Math.random() * 500 + 50  // Random y between 50 and 550
        };
        this.players.set(id, player);
        return true;
    }

    // Remove a player from the room
    removePlayer(id) {
        this.players.delete(id);
        // End game if player count drops below minimum
        if (this.gameStarted && this.players.size < this.minPlayers) {
            this.gameStarted = false;
            return true; // Signal game should end
        }
        return false;
    }

    // Check if room is full
    isRoomFull() {
        return this.players.size >= this.maxPlayers;
    }

    // Check if game can start (enough players)
    canStartGame() {
        return this.players.size >= this.minPlayers;
    }

    // Get all alive players
    getAlivePlayers() {
        return Array.from(this.players.values()).filter(player => player.isAlive);
    }

    // Generate new spike
    generateSpike() {
        const directions = ['up', 'down', 'left', 'right'];
        // Remove last direction to avoid same direction twice
        if (this.lastSpikeDirection) {
            const index = directions.indexOf(this.lastSpikeDirection);
            if (index > -1) {
                directions.splice(index, 1);
            }
        }
        // Randomly select from remaining directions
        const direction = directions[Math.floor(Math.random() * directions.length)];
        this.lastSpikeDirection = direction;
        
        this.currentSpike = {
            direction,
            speed: this.spikeSpeed,
            position: this.getInitialSpikePosition(direction)
        };
        
        return this.currentSpike;
    }

    // Get initial position for spike based on direction
    getInitialSpikePosition(direction) {
        switch(direction) {
            case 'up':
                return { x: Math.random() * 800, y: 600 };
            case 'down':
                return { x: Math.random() * 800, y: 0 };
            case 'left':
                return { x: 800, y: Math.random() * 600 };
            case 'right':
                return { x: 0, y: Math.random() * 600 };
        }
    }

    // Increase game difficulty
    increaseDifficulty() {
        this.spikeSpeed *= 1.1;  // Increase speed by 10%
    }

    // Check if game is over (only one player alive)
    isGameOver() {
        const alivePlayers = this.getAlivePlayers();
        return this.gameStarted && alivePlayers.length <= 1;
    }

    // Get winner (last player alive)
    getWinner() {
        const alivePlayers = this.getAlivePlayers();
        return alivePlayers.length === 1 ? alivePlayers[0] : null;
    }
}

module.exports = Room;