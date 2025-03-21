class Game {
    constructor() {
        // Initialize socket with error handling
        this.socket = io('http://localhost:8000', {
            transports: ['websocket'],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: 5
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            alert('Failed to connect to game server. Please try again.');
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = new Map();
        this.currentSpike = null;
        this.gameStarted = false;
        this.currentScreen = 'welcome';
        
        // Game settings
        this.settings = {
            canvasWidth: 800,
            canvasHeight: 600,
            playerSize: 30,
            spikeSize: 20,
            obstacleSize: 100,
            playerSpeed: 5
        };

        // Central obstacle
        this.obstacle = {
            x: this.settings.canvasWidth / 2 - this.settings.obstacleSize / 2,
            y: this.settings.canvasHeight / 2 - this.settings.obstacleSize / 2,
            width: this.settings.obstacleSize,
            height: this.settings.obstacleSize
        };

        // Movement keys state
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            s: false,
            a: false,
            d: false
        };

        this.setupEventListeners();
        this.setupSocketListeners();
        this.resizeCanvas();
    }

    setupEventListeners() {
        // Screen navigation buttons
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.joinExistingRoom());
        document.getElementById('submitJoinBtn').addEventListener('click', () => {
            const code = document.getElementById('partyCodeInput').value.toUpperCase();
            if (code) {
                this.partyCode = code;
                this.showScreen('avatar');
                document.getElementById('joinRoomForm').classList.add('hidden');
                document.getElementById('partyCodeInput').value = '';
            }
        });

        document.getElementById('cancelJoinBtn').addEventListener('click', () => {
            document.getElementById('joinRoomForm').classList.add('hidden');
            document.getElementById('partyCodeInput').value = '';
        });
        document.getElementById('confirmAvatarBtn').addEventListener('click', () => {
            this.joinRoom();
        });
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.socket.emit('startGame', { partyCode: this.partyCode });
        });
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.showScreen('welcome');
        });
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            // Reset game state
            this.players.clear();
            this.partyCode = null;
            this.playerId = null;
            this.gameStarted = false;
            this.currentSpike = null;
            // Return to welcome screen
            this.showScreen('welcome');
        });

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });

        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    setupSocketListeners() {
        this.socket.on('roomJoined', (data) => {
            try {
                console.log('Room joined:', data);
                this.partyCode = data.partyCode;
                this.playerId = data.playerId;
                
                // Initialize player in the room
                const avatarConfig = window.avatarCreator.getAvatarConfig();
                const player = {
                    id: this.playerId,
                    avatar: avatarConfig,
                    position: { x: 400, y: 300 }, // Center of the canvas
                    lives: 3,
                    state: 'king'
                };
                this.players.clear(); // Clear existing players
                this.players.set(this.playerId, player);
                
                // Update UI
                const partyCodeDisplay = document.querySelector('#partyCodeDisplay p:last-child');
                if (partyCodeDisplay) {
                    partyCodeDisplay.textContent = this.partyCode;
                }

                // Update player list immediately
                this.updatePlayerList([player]);

                // Show lobby screen after everything is set up
                this.showScreen('lobby');
            } catch (error) {
                console.error('Error in roomJoined:', error);
                alert('Failed to join room. Please try again.');
                this.resetGameState();
                this.showScreen('welcome');
            }
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert('An error occurred. Please try again.');
            this.resetGameState();
            this.showScreen('welcome');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.resetGameState();
            this.showScreen('welcome');
        });

        this.socket.on('playersUpdate', (data) => {
            // Clear existing players and update with new data
            this.players.clear();
            this.updatePlayerList(data.players);
            const playerCount = data.players.length;
            const startBtn = document.getElementById('startGameBtn');
            if (playerCount >= 2 && playerCount <= 8) {
                startBtn.disabled = false;
                startBtn.textContent = 'Start Game';
            } else {
                startBtn.disabled = true;
                startBtn.textContent = `Waiting for players (${playerCount}/2-8)`;
            }
        });

        this.socket.on('gameStarted', () => {
            this.gameStarted = true;
            this.showScreen('game');
            this.startGameLoop();
        });

        this.socket.on('newSpike', (spike) => {
            this.currentSpike = spike;
            this.showSpikeWarning(spike.direction);
            // Hide warning after 1 second
            setTimeout(() => this.hideSpikeWarning(spike.direction), 1000);
        });

        this.socket.on('playerStateUpdate', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.lives = data.lives;
                player.state = data.state;
                if (data.isEliminated) {
                    this.players.delete(data.playerId);
                }
                this.updateHUD();
            }
        });

        this.socket.on('playerMoved', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.position = data.position;
            }
        });

        this.socket.on('gameOver', (data) => {
            this.gameStarted = false;
            this.showGameOver(data.winner);
        });

        this.socket.on('roomError', (data) => {
            alert(data.message);
        });
    }

    joinRoom() {
        try {
            const avatarConfig = window.avatarCreator.getAvatarConfig();
            console.log('Joining room with config:', {
                partyCode: this.partyCode,
                avatar: avatarConfig
            });
            
            // For create room, partyCode will be undefined
            // For join room, partyCode will be set from the input
            this.socket.emit('joinRoom', {
                partyCode: this.partyCode,
                avatar: avatarConfig
            });
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
            this.showScreen('welcome');
        }
    }

    createRoom() {
        this.partyCode = undefined; // Ensure no party code for new room
        this.showScreen('avatar');
    }

    joinExistingRoom() {
        document.getElementById('joinRoomForm').classList.remove('hidden');
    }

    updatePlayerList(players) {
        try {
            const container = document.getElementById('playerListContainer');
            if (!container) {
                console.error('Player list container not found');
                return;
            }
            container.innerHTML = '';
            
            players.forEach(player => {
                // Update players Map
                this.players.set(player.id, player);
                
                // Create player list item
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-list-item flex items-center gap-4 bg-gray-800 p-4 rounded-lg mb-2';
                
                // Create avatar preview with state-based styling
                const avatarPreview = document.createElement('div');
                avatarPreview.className = 'relative';
                
                const avatar = document.createElement('div');
                avatar.className = 'w-12 h-12 rounded-full flex items-center justify-center';
                avatar.style.backgroundColor = player.avatar.color;
                
                // Add state-based effects
                if (player.state === 'king') {
                    const crown = document.createElement('i');
                    crown.className = 'fas fa-crown text-yellow-400 absolute -top-2 left-1/2 transform -translate-x-1/2';
                    avatarPreview.appendChild(crown);
                } else if (player.state === 'nervous') {
                    avatar.classList.add('animate-pulse');
                }
                
                avatarPreview.appendChild(avatar);
                
                // Create player info
                const info = document.createElement('div');
                info.className = 'flex flex-col flex-grow';
                
                const nameRow = document.createElement('div');
                nameRow.className = 'flex items-center justify-between';
                
                const name = document.createElement('span');
                name.className = 'font-bold text-white';
                name.textContent = player.id === this.playerId ? 'You' : 'Player';
                
                const lives = document.createElement('div');
                lives.className = 'flex items-center gap-1';
                for (let i = 0; i < player.lives; i++) {
                    const heart = document.createElement('i');
                    heart.className = 'fas fa-heart text-red-500';
                    lives.appendChild(heart);
                }
                
                nameRow.appendChild(name);
                nameRow.appendChild(lives);
                info.appendChild(nameRow);
                
                playerDiv.appendChild(avatarPreview);
                playerDiv.appendChild(info);
                container.appendChild(playerDiv);
            });
        } catch (error) {
            console.error('Error updating player list:', error);
        }
    }

    showScreen(screenName) {
        try {
            // First hide all screens
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            });

            // Show the requested screen
            const screen = document.getElementById(`${screenName}Screen`);
            if (!screen) {
                console.error(`Screen ${screenName} not found`);
                return;
            }

            // Special handling for lobby screen
            if (screenName === 'lobby') {
                // Ensure party code is displayed
                const partyCodeDisplay = document.querySelector('#partyCodeDisplay p:last-child');
                if (partyCodeDisplay && this.partyCode) {
                    partyCodeDisplay.textContent = this.partyCode;
                }
                // Update player list
                if (this.players.size > 0) {
                    this.updatePlayerList(Array.from(this.players.values()));
                }
            }

            // Show the screen
            screen.classList.remove('hidden');
            screen.classList.add('active');
            this.currentScreen = screenName;
            
            console.log(`Switched to ${screenName} screen`);
        } catch (error) {
            console.error('Error showing screen:', error);
            // On error, show welcome screen
            const welcomeScreen = document.getElementById('welcomeScreen');
            if (welcomeScreen) {
                welcomeScreen.classList.remove('hidden');
                welcomeScreen.classList.add('active');
                this.currentScreen = 'welcome';
            }
        }
    }

    resizeCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
        
        // Scale canvas to fit window while maintaining aspect ratio
        const scale = Math.min(
            window.innerWidth / this.settings.canvasWidth,
            window.innerHeight / this.settings.canvasHeight
        );
        
        this.canvas.style.width = `${this.settings.canvasWidth * scale}px`;
        this.canvas.style.height = `${this.settings.canvasHeight * scale}px`;
    }

    startGameLoop() {
        if (!this.gameLoopRunning) {
            this.gameLoopRunning = true;
            this.gameLoop();
        }
    }

    gameLoop() {
        if (!this.gameStarted) {
            this.gameLoopRunning = false;
            return;
        }

        this.updatePlayerPosition();
        this.checkCollisions();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    updatePlayerPosition() {
        const player = this.players.get(this.playerId);
        if (!player) return;

        let dx = 0;
        let dy = 0;

        // Calculate movement based on key states
        if ((this.keys.ArrowUp || this.keys.w) && player.position.y > 0) dy -= this.settings.playerSpeed;
        if ((this.keys.ArrowDown || this.keys.s) && player.position.y < this.settings.canvasHeight) dy += this.settings.playerSpeed;
        if ((this.keys.ArrowLeft || this.keys.a) && player.position.x > 0) dx -= this.settings.playerSpeed;
        if ((this.keys.ArrowRight || this.keys.d) && player.position.x < this.settings.canvasWidth) dx += this.settings.playerSpeed;

        // Apply movement if any
        if (dx !== 0 || dy !== 0) {
            const newX = Math.max(0, Math.min(this.settings.canvasWidth, player.position.x + dx));
            const newY = Math.max(0, Math.min(this.settings.canvasHeight, player.position.y + dy));
            
            // Check collision with obstacle
            if (!this.checkObstacleCollision(newX, newY)) {
                player.position.x = newX;
                player.position.y = newY;
                this.socket.emit('playerMove', {
                    partyCode: this.partyCode,
                    position: player.position
                });
            }
        }
    }

    checkObstacleCollision(x, y) {
        const playerRadius = this.settings.playerSize / 2;
        return (x + playerRadius > this.obstacle.x &&
                x - playerRadius < this.obstacle.x + this.obstacle.width &&
                y + playerRadius > this.obstacle.y &&
                y - playerRadius < this.obstacle.y + this.obstacle.height);
    }

    checkCollisions() {
        if (!this.currentSpike) return;
        
        const player = this.players.get(this.playerId);
        if (!player) return;

        const playerBounds = {
            x: player.position.x - this.settings.playerSize / 2,
            y: player.position.y - this.settings.playerSize / 2,
            width: this.settings.playerSize,
            height: this.settings.playerSize
        };

        const spikeBounds = {
            x: this.currentSpike.position.x - this.settings.spikeSize / 2,
            y: this.currentSpike.position.y - this.settings.spikeSize / 2,
            width: this.settings.spikeSize,
            height: this.settings.spikeSize
        };

        if (this.checkBoundsCollision(playerBounds, spikeBounds)) {
            this.socket.emit('spikeCollision', { partyCode: this.partyCode });
        }
    }

    checkBoundsCollision(bounds1, bounds2) {
        return bounds1.x < bounds2.x + bounds2.width &&
               bounds1.x + bounds1.width > bounds2.x &&
               bounds1.y < bounds2.y + bounds2.height &&
               bounds1.y + bounds1.height > bounds2.y;
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw obstacle
        this.ctx.fillStyle = '#4B5563';
        this.ctx.fillRect(
            this.obstacle.x,
            this.obstacle.y,
            this.obstacle.width,
            this.obstacle.height
        );

        // Draw players
        this.players.forEach((player, id) => {
            window.avatarCreator.drawOnCanvas(
                this.ctx,
                player.position.x,
                player.position.y,
                this.settings.playerSize,
                player.lives
            );
        });

        // Draw current spike
        if (this.currentSpike) {
            this.ctx.save();
            this.ctx.translate(this.currentSpike.position.x, this.currentSpike.position.y);
            
            // Rotate based on direction
            switch(this.currentSpike.direction) {
                case 'up': this.ctx.rotate(0); break;
                case 'down': this.ctx.rotate(Math.PI); break;
                case 'left': this.ctx.rotate(Math.PI / 2); break;
                case 'right': this.ctx.rotate(-Math.PI / 2); break;
            }

            // Draw spike
            this.ctx.beginPath();
            this.ctx.moveTo(0, -this.settings.spikeSize/2);
            this.ctx.lineTo(this.settings.spikeSize/2, this.settings.spikeSize/2);
            this.ctx.lineTo(-this.settings.spikeSize/2, this.settings.spikeSize/2);
            this.ctx.closePath();
            this.ctx.fillStyle = '#EF4444';
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    updateHUD() {
        const player = this.players.get(this.playerId);
        if (player) {
            document.querySelector('.lives-count').textContent = player.lives;
        }
    }

    resetGameState() {
        this.players.clear();
        this.partyCode = null;
        this.playerId = null;
        this.gameStarted = false;
        this.currentSpike = null;
        this.gameLoopRunning = false;
    }

    showGameOver(winnerId) {
        this.showScreen('gameOver');
        const winnerDisplay = document.querySelector('#winnerDisplay p');
        if (winnerId === this.playerId) {
            winnerDisplay.textContent = 'You Won!';
        } else if (winnerId) {
            winnerDisplay.textContent = 'Game Over - You Lost!';
        } else {
            winnerDisplay.textContent = 'Game Over!';
        }
        this.resetGameState();
    }

    showSpikeWarning(direction) {
        const warning = document.getElementById(`${direction}Warning`);
        if (warning) {
            warning.classList.remove('hidden');
            warning.classList.add('fade-in');
        }
    }

    hideSpikeWarning(direction) {
        const warning = document.getElementById(`${direction}Warning`);
        if (warning) {
            warning.classList.add('fade-out');
            setTimeout(() => {
                warning.classList.remove('fade-in', 'fade-out');
                warning.classList.add('hidden');
            }, 300);
        }
    }
}

// Initialize game when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
