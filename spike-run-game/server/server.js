const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Store active rooms
const rooms = new Map();

// Generate unique party code
function generatePartyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Create or join a room
    socket.on('joinRoom', ({ partyCode, avatar }) => {
        try {
            let room;
            
            // If party code is not provided, create a new room
            if (!partyCode) {
                partyCode = generatePartyCode();
                room = new Room(partyCode);
                rooms.set(partyCode, room);
            } else {
                room = rooms.get(partyCode);
                if (!room) {
                    socket.emit('roomError', { message: 'Room not found' });
                    return;
                }
                if (room.isRoomFull()) {
                    socket.emit('roomError', { message: 'Room is full' });
                    return;
                }
            }

            // Add player to room
            if (room.addPlayer(socket.id, avatar)) {
                socket.join(partyCode);
                socket.emit('roomJoined', { 
                    partyCode,
                    playerId: socket.id,
                    isNewRoom: !partyCode
                });
                
                // Broadcast updated player list
                io.to(partyCode).emit('playersUpdate', {
                    players: Array.from(room.players.values())
                });

                // Check if game can start
                if (room.canStartGame()) {
                    io.to(partyCode).emit('gameReady');
                }
            }
        } catch (error) {
            console.error('Error in joinRoom:', error);
            socket.emit('roomError', { message: 'Failed to join room' });
        }
    });

    // Handle player movement
    socket.on('playerMove', ({ partyCode, position }) => {
        try {
            const room = rooms.get(partyCode);
            if (room && room.players.has(socket.id)) {
                const player = room.players.get(socket.id);
                player.updatePosition(position.x, position.y);
                socket.to(partyCode).emit('playerMoved', {
                    playerId: socket.id,
                    position
                });
            }
        } catch (error) {
            console.error('Error in playerMove:', error);
        }
    });

    // Start game
    socket.on('startGame', ({ partyCode }) => {
        try {
            const room = rooms.get(partyCode);
            if (room && room.canStartGame()) {
                room.gameStarted = true;
                io.to(partyCode).emit('gameStarted');
                
                // Start spike generation
                startSpikeGeneration(room, partyCode);
            }
        } catch (error) {
            console.error('Error in startGame:', error);
        }
    });

    // Handle spike collision
    socket.on('spikeCollision', ({ partyCode }) => {
        try {
            const room = rooms.get(partyCode);
            if (room && room.players.has(socket.id)) {
                const player = room.players.get(socket.id);
                const isEliminated = player.handleCollision();
                
                // Broadcast updated player state
                io.to(partyCode).emit('playerStateUpdate', {
                    playerId: socket.id,
                    lives: player.lives,
                    state: player.currentState,
                    isEliminated
                });

                // Check if game is over
                if (room.isGameOver()) {
                    const winner = room.getWinner();
                    io.to(partyCode).emit('gameOver', {
                        winner: winner ? winner.id : null
                    });
                    rooms.delete(partyCode);
                }
            }
        } catch (error) {
            console.error('Error in spikeCollision:', error);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        try {
            // Find and remove player from their room
            for (const [partyCode, room] of rooms.entries()) {
                if (room.players.has(socket.id)) {
                    const shouldEndGame = room.removePlayer(socket.id);
                    
                    if (shouldEndGame) {
                        io.to(partyCode).emit('gameOver', {
                            reason: 'Not enough players'
                        });
                        rooms.delete(partyCode);
                    } else {
                        io.to(partyCode).emit('playerLeft', {
                            playerId: socket.id
                        });
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Error in disconnect:', error);
        }
    });
});

// Generate spikes for a room
function startSpikeGeneration(room, partyCode) {
    const generateSpike = () => {
        if (!rooms.has(partyCode)) return; // Stop if room no longer exists
        
        const spike = room.generateSpike();
        io.to(partyCode).emit('newSpike', spike);

        // Increase difficulty every 30 seconds
        room.increaseDifficulty();
        
        // Schedule next spike after current one should have completed
        const baseDelay = 3000; // Base delay of 3 seconds
        const speedAdjustedDelay = baseDelay / room.spikeSpeed;
        setTimeout(generateSpike, speedAdjustedDelay);
    };

    generateSpike();
}

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});