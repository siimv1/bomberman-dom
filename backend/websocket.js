const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = [];
let selectedPlayerCount = 0;

const startingPositions = [
  { x: 0, y: 0 },    // Top-left corner
  { x: 9, y: 0 },    // Top-right corner
  { x: 0, y: 9 },    // Bottom-left corner
  { x: 9, y: 9 }     // Bottom-right corner
];

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
      broadcastPlayerList();

      // Start the game when enough players have joined
      if (players.length === selectedPlayerCount) {
        broadcastMessage({ type: 'startGame', players: players });
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
    broadcastPlayerList(); // Notify all players of the updated list
  });
});

function broadcastPlayerList() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'playerListUpdate',
        players: players.map(player => player.nickname),  // Send only the nicknames of the players
        playerCount: players.length,
        maxPlayers: selectedPlayerCount
      }));
    }
  });
}


// Broadcast messages to all connected clients
function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

console.log('WebSocket server is running on ws://localhost:8080');
