class AvatarCreator {
    constructor() {
        this.currentAvatar = {
            shape: 'circle',
            color: '#FCD34D',
            pattern: 'solid'
        };
        
        this.preview = document.getElementById('avatarPreview');
        this.crownPreview = document.getElementById('crownPreview');
        
        this.setupEventListeners();
        this.updatePreview();
    }

    setupEventListeners() {
        // Shape buttons
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentAvatar.shape = btn.dataset.shape;
                this.updatePreview();
            });
        });

        // Color picker
        const colorPicker = document.getElementById('avatarColor');
        colorPicker.addEventListener('input', (e) => {
            this.currentAvatar.color = e.target.value;
            this.updatePreview();
        });

        // Pattern buttons
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentAvatar.pattern = btn.dataset.pattern;
                this.updatePreview();
            });
        });
    }

    updatePreview() {
        // Update shape and color
        this.preview.style.backgroundColor = this.currentAvatar.color;
        
        switch(this.currentAvatar.shape) {
            case 'circle':
                this.preview.style.borderRadius = '50%';
                break;
            case 'square':
                this.preview.style.borderRadius = '10%';
                break;
            case 'triangle':
                this.preview.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
                break;
        }

        // Update pattern
        switch(this.currentAvatar.pattern) {
            case 'solid':
                this.preview.style.backgroundImage = 'none';
                break;
            case 'striped':
                this.preview.style.backgroundImage = 
                    `repeating-linear-gradient(45deg, 
                        ${this.currentAvatar.color}, 
                        ${this.currentAvatar.color} 10px, 
                        ${this.adjustColor(this.currentAvatar.color, -20)} 10px, 
                        ${this.adjustColor(this.currentAvatar.color, -20)} 20px)`;
                break;
            case 'dotted':
                this.preview.style.backgroundImage = 
                    `radial-gradient(circle at 3px 3px, 
                        ${this.adjustColor(this.currentAvatar.color, -20)} 1px, 
                        ${this.currentAvatar.color} 2px)`;
                this.preview.style.backgroundSize = '10px 10px';
                break;
        }
    }

    // Helper function to adjust color brightness
    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(Math.min(parseInt(hex.substring(0, 2), 16) + amount, 255), 0);
        const g = Math.max(Math.min(parseInt(hex.substring(2, 4), 16) + amount, 255), 0);
        const b = Math.max(Math.min(parseInt(hex.substring(4, 6), 16) + amount, 255), 0);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Get current avatar configuration
    getAvatarConfig() {
        return { ...this.currentAvatar };
    }

    // Update avatar state based on lives
    updateState(lives) {
        switch(lives) {
            case 3:
                this.crownPreview.classList.remove('hidden');
                this.preview.classList.remove('nervous-state');
                this.preview.classList.add('king-state');
                break;
            case 2:
                this.crownPreview.classList.add('hidden');
                this.preview.classList.remove('king-state', 'nervous-state');
                break;
            case 1:
                this.crownPreview.classList.add('hidden');
                this.preview.classList.remove('king-state');
                this.preview.classList.add('nervous-state');
                // Add sweat effect
                this.addSweatEffect();
                break;
        }
    }

    // Add sweat animation effect
    addSweatEffect() {
        if (!this.sweatInterval) {
            this.sweatInterval = setInterval(() => {
                const sweat = document.createElement('div');
                sweat.className = 'sweat-drop';
                sweat.style.left = `${Math.random() * 100}%`;
                this.preview.appendChild(sweat);

                // Remove sweat drop after animation
                setTimeout(() => {
                    sweat.remove();
                }, 1000);
            }, 500);
        }
    }

    // Remove sweat effect
    removeSweatEffect() {
        if (this.sweatInterval) {
            clearInterval(this.sweatInterval);
            this.sweatInterval = null;
        }
    }

    // Create a game canvas version of the avatar
    drawOnCanvas(ctx, x, y, size, lives) {
        ctx.save();
        
        // Draw base shape
        ctx.beginPath();
        switch(this.currentAvatar.shape) {
            case 'circle':
                ctx.arc(x, y, size/2, 0, Math.PI * 2);
                break;
            case 'square':
                ctx.rect(x - size/2, y - size/2, size, size);
                break;
            case 'triangle':
                ctx.moveTo(x, y - size/2);
                ctx.lineTo(x - size/2, y + size/2);
                ctx.lineTo(x + size/2, y + size/2);
                ctx.closePath();
                break;
        }

        // Fill with pattern if needed
        if (this.currentAvatar.pattern === 'solid') {
            ctx.fillStyle = this.currentAvatar.color;
            ctx.fill();
        } else {
            // Create pattern
            const patternCanvas = document.createElement('canvas');
            const patternCtx = patternCanvas.getContext('2d');
            patternCanvas.width = 20;
            patternCanvas.height = 20;

            if (this.currentAvatar.pattern === 'striped') {
                patternCtx.fillStyle = this.currentAvatar.color;
                patternCtx.fillRect(0, 0, 20, 20);
                patternCtx.fillStyle = this.adjustColor(this.currentAvatar.color, -20);
                patternCtx.fillRect(0, 0, 10, 20);
            } else if (this.currentAvatar.pattern === 'dotted') {
                patternCtx.fillStyle = this.currentAvatar.color;
                patternCtx.fillRect(0, 0, 20, 20);
                patternCtx.fillStyle = this.adjustColor(this.currentAvatar.color, -20);
                patternCtx.beginPath();
                patternCtx.arc(10, 10, 3, 0, Math.PI * 2);
                patternCtx.fill();
            }

            const pattern = ctx.createPattern(patternCanvas, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fill();
        }

        // Add crown for 3 lives
        if (lives === 3) {
            ctx.fillStyle = '#FCD34D';  // Yellow crown
            ctx.beginPath();
            ctx.moveTo(x - size/3, y - size/2 - 10);
            ctx.lineTo(x + size/3, y - size/2 - 10);
            ctx.lineTo(x + size/4, y - size/2);
            ctx.lineTo(x - size/4, y - size/2);
            ctx.closePath();
            ctx.fill();
        }

        // Add sweat drops for 1 life
        if (lives === 1) {
            ctx.fillStyle = '#60A5FA';  // Blue sweat
            ctx.beginPath();
            ctx.arc(x + size/2, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Create avatar instance when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.avatarCreator = new AvatarCreator();
});