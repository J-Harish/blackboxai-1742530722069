# Spike Run Game

A multiplayer 2D game where players must avoid spikes while using obstacles for protection. Developed by Harish.

## Features

- Multiplayer gameplay supporting 2-8 players
- Party code system for easy room creation and joining
- Custom avatar creation with different shapes, colors, and patterns
- Three lives system with unique visual states:
  - 3 lives: Crown effect
  - 2 lives: Normal state
  - 1 life: Nervous state with sweat animation
- Central obstacle for tactical gameplay
- Increasing difficulty as the game progresses
- Real-time multiplayer synchronization
- Responsive design for various screen sizes

## Setup & Installation

1. Install Node.js dependencies:
```bash
cd spike-run-game/server
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the game:
- Open `http://localhost:3000` in your web browser
- For multiplayer over local network (hotspot):
  1. Create a hotspot on one device
  2. Connect other devices to this hotspot
  3. Access the game using the host device's local IP address (e.g., `http://192.168.x.x:3000`)

## How to Play

1. **Starting a Game:**
   - Click "Create Room" to host a new game
   - Click "Join Room" and enter a party code to join an existing game
   - Customize your avatar using the available options

2. **Game Controls:**
   - Use Arrow Keys or WASD to move your player
   - Hide behind the central obstacle to avoid spikes
   - Watch out for spikes coming from different directions
   - Each player has 3 lives:
     - Crown appears when you have all 3 lives
     - Normal appearance with 2 lives
     - Sweating animation when on your last life

3. **Objective:**
   - Survive longer than other players
   - Avoid getting hit by spikes
   - Use the central obstacle strategically
   - Last player standing wins!

## Technical Details

- Built with:
  - Frontend: HTML5 Canvas, JavaScript, Tailwind CSS
  - Backend: Node.js, Express, Socket.IO
  - Real-time multiplayer communication
  - Responsive design for various devices

## Credits

Developed by Harish

## Notes

- Minimum 2 players required to start a game
- Maximum 8 players per room
- Game difficulty increases over time (spike speed)
- Each player has 3 chances before elimination
- Use party codes to easily join specific game rooms