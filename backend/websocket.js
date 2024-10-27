const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
let players = [];
let selectedPlayerCount = 0;


const startingPositions = [
  { x: 0, y: 0 },    // Top-left
  { x: 14, y: 0 },    // Top-right
  { x: 0, y: 14 },    // Bottom-left
  { x: 14, y: 14 }     // Bottom-right 
];
function generateMapLayout(gridSize) {
  const layout = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

  // Hardcode each 2x2 corner with a specific pattern to ensure correct floor and wall placement

  // Top-left corner
  layout[0][0] = 0;          // Floor
  layout[0][1] = 0;          // Floor
  layout[1][0] = 0;          // Floor
  layout[1][1] = 1;          // Indestructible wall

  // Top-right corner
  layout[0][gridSize - 2] = 0;  // Floor
  layout[0][gridSize - 1] = 0;  // Floor
  layout[1][gridSize - 2] = 1;  // Indestructible wall
  layout[1][gridSize - 1] = 0;  // Floor

  // Bottom-left corner
  layout[gridSize - 2][0] = 0;  // Floor
  layout[gridSize - 1][0] = 0;  // Floor
  layout[gridSize - 2][1] = 1;  // Indestructible wall
  layout[gridSize - 1][1] = 0;  // Floor

  // Bottom-right corner
  layout[gridSize - 2][gridSize - 2] = 1; // Indestructible wall
  layout[gridSize - 2][gridSize - 1] = 0; // Floor
  layout[gridSize - 1][gridSize - 2] = 0; // Floor
  layout[gridSize - 1][gridSize - 1] = 0; // Floor

  // Fill the rest of the grid with indestructible walls on odd cells and randomly placed destructible blocks
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Skip the 2x2 corner areas
      if (
        (row < 2 && col < 2) || // Top-left corner
        (row < 2 && col >= gridSize - 2) || // Top-right corner
        (row >= gridSize - 2 && col < 2) || // Bottom-left corner
        (row >= gridSize - 2 && col >= gridSize - 2) // Bottom-right corner
      ) {
        continue;
      }

      // Place indestructible walls on odd cells
      if (row % 2 === 1 && col % 2 === 1) {
        layout[row][col] = 1; // Indestructible wall
      } else {
        // 80% chance of being destructible block, 20% chance of being floor
        layout[row][col] = Math.random() > 0.2 ? 2 : 0;
      }
    }
  }

  return layout;
}


// Function to broadcast data to all clients
function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
// Function to start the game
function startGame() {
  const gridSize = 15; // Adjust this as needed
  const mapLayout = generateMapLayout(gridSize); // Generate a dynamic 10x10 grid layout
  
  console.log("Server: Starting game with map layout:", mapLayout);  // Debugging log to verify map layout
  const gameData = {
      type: 'startGame',
      players: players,
      mapLayout: mapLayout  // Ensure mapLayout is included here
  };
  broadcastMessage(gameData); // Broadcast to all players
}
// WebSocket connection handler
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'join') {
      // Set the selectedPlayerCount only when the first player joins
      if (players.length === 0) {
        selectedPlayerCount = parseInt(data.playerCount); // Set the number of players for the game
      }
      // Prevent more players from joining after the max player count is reached
      if (players.length >= selectedPlayerCount) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
        return;
      }
      // Assign a new player their starting position and nickname
      const newPlayer = {
        id: players.length + 1,
        nickname: data.nickname,
        lives: 3,
        position: startingPositions[players.length]
      };
      players.push(newPlayer);
      // Send this player their player ID
      ws.send(JSON.stringify({ type: 'assignPlayerId', playerId: newPlayer.id }));
      // Broadcast the updated player list and player count to all players
      broadcastMessage({
        type: 'playerListUpdate',
        players: players.map(player => player.nickname),
        playerCount: players.length,
        maxPlayers: selectedPlayerCount
      });
      // Start the game when enough players have joined
      if (players.length === selectedPlayerCount) {
        startGame();  // Call startGame here
      }
    }
    // Handle player movement
    if (data.type === 'playerMoved') {
      const player = players.find(p => p.id === data.playerId);
      if (player) {
        player.position = data.position;
        broadcastMessage({ type: 'playerMoved', playerId: data.playerId, position: data.position });
      }
    }
  });
  ws.on('close', () => {
    players.pop();  // Remove a player when they disconnect
    broadcastMessage({
      type: 'playerListUpdate',
      players: players.map(player => player.nickname),
      playerCount: players.length,
      maxPlayers: selectedPlayerCount
    });
  });
});
console.log('WebSocket server is running on ws://localhost:8080');