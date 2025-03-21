class Player {
    constructor(id, avatar) {
        this.id = id;
        this.avatar = avatar;
        this.position = { x: 0, y: 0 };
        this.lives = 3;          // Start with 3 chances
        this.isAlive = true;
        this.currentState = 'king';  // Visual state based on lives
    }

    // Update visual state based on remaining lives
    updateVisualState() {
        if (this.lives === 3) {
            this.currentState = 'king';
        } else if (this.lives === 2) {
            this.currentState = 'normal';
        } else if (this.lives === 1) {
            this.currentState = 'nervous';
        } else {
            this.isAlive = false;
        }
    }

    // Handle collision with spike
    handleCollision() {
        if (this.lives > 0) {
            this.lives--;
            this.updateVisualState();
        }
        return this.lives === 0;  // Return true if player is eliminated
    }

    // Update player position
    updatePosition(x, y) {
        this.position.x = x;
        this.position.y = y;
    }
}

module.exports = Player;