class BombermanLobby {
  constructor(framework) {
    this.framework = framework;
    this.playerCount = 0;
    this.maxPlayers = 4;
    this.socket = null;
    this.players = [];
    this.currentPlayerId = null;  // The ID of the current player (set by the server)
    this.gridSize = 15;  // Define the grid size for the game
    this.init();
  }

  init() {
    this.renderLobby();
    this.setupWebSocket();
  }

  renderLobby() {
    this.framework.renderDomTree(this.createLobbyView(), document.getElementById('app'));
  }

  createLobbyView() {
    return this.framework.createDomElement('div', {}, [
      this.framework.createDomElement('h1', {}, ['Bomberman']),
      this.framework.createDomElement('p', { id: 'player-count' }, [`Waiting for players... 0/${this.maxPlayers}`]),
      this.framework.createDomElement('ul', { id: 'player-list' }, []),  // Player list to display joined players
      this.framework.createDomElement('input', { id: 'nickname', placeholder: 'Enter your nickname' }, []),
      this.framework.createDomElement('label', { for: 'playerCount' }, ['Select Number of Players:']),
      this.framework.createDomElement('select', { id: 'playerCount', onchange: () => this.updateMaxPlayers() }, [
        this.framework.createDomElement('option', { value: '2' }, ['2 Players']),
        this.framework.createDomElement('option', { value: '3' }, ['3 Players']),
        this.framework.createDomElement('option', { value: '4' }, ['4 Players']),
      ]),
      this.framework.createDomElement('button', { onclick: () => this.joinGame() }, ['Join Game'])
    ]);
  }
  

  updateMaxPlayers() {
    const playerCount = document.getElementById('playerCount').value;
    this.maxPlayers = parseInt(playerCount);
    const playerCountElement = document.getElementById('player-count');
    playerCountElement.textContent = `Waiting for players... 0/${this.maxPlayers}`;
  }

  setupWebSocket() {
    this.socket = new WebSocket('ws://localhost:8080');
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);  // Debugging log to confirm message structure
  
      if (data.type === 'assignPlayerId') {
          this.currentPlayerId = data.playerId;
      } else if (data.type === 'playerListUpdate') {
          this.updatePlayerList(data.players, data.playerCount, data.maxPlayers);
      } else if (data.type === 'startGame') {
          console.log("Starting game on client...", data.mapLayout);  // Debugging log
          this.startGame(data.players, data.mapLayout);  // Pass mapLayout to startGame
      } else if (data.type === 'playerMoved') {
          this.updatePlayerPosition(data.playerId, data.position);
      }
  };
  
  
  }

  joinGame() {
    const nickname = document.getElementById('nickname').value;
    const playerCount = document.getElementById('playerCount').value;
    if (nickname && this.socket) {
      this.socket.send(JSON.stringify({ type: 'join', nickname: nickname, playerCount: playerCount }));
    }
  }

  updatePlayerList(players, playerCount, maxPlayers) {
    this.playerCount = playerCount;
    this.maxPlayers = maxPlayers;
  
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
      playerCountElement.textContent = `Waiting for players... ${this.playerCount}/${this.maxPlayers}`;
    }
  
    const playerListElement = document.getElementById('player-list');
    console.log("Updating player list. Element found:", !!playerListElement);
  
    if (!playerListElement) {
      console.error("Element with id 'player-list' not found in the DOM.");
      return;
    }
  
    playerListElement.innerHTML = '';  // Clear current list
    players.forEach(player => {
      const playerItem = document.createElement('li');
      playerItem.textContent = player;  // Set the player's name
      playerListElement.appendChild(playerItem);
    });
  }
  

  startGame(players, mapLayout) {
    this.players = players;
    this.mapLayout = mapLayout;

    // Debugging log to verify mapLayout is received
    console.log("Starting game with mapLayout:", this.mapLayout);

    if (!this.mapLayout) {
        console.error("mapLayout is undefined in startGame");
        return;
    }

    console.log('Game starting...');
    this.framework.renderDomTree(this.createGameView(), document.getElementById('app'));
    this.initGameLogic();  
    this.renderPlayers(); 
}



createGameView() {
  if (!this.mapLayout) {
    console.error("mapLayout is undefined in createGameView");
    return this.framework.createDomElement('div', {}, [document.createTextNode("Error: map layout not found")]);
  }

  const grid = [];
  for (let row = 0; row < this.mapLayout.length; row++) {
    for (let col = 0; col < this.mapLayout[row].length; col++) {
      const cellType = this.mapLayout[row][col];
      let className = 'grid-cell';

      if (cellType === 1) {
        className += ' wall';  // Indestructible wall
      } else if (cellType === 2) {
        className += ' block'; // Destructible block
      } else {
        className += ' floor'; // Floor/grass
      }

      grid.push(this.framework.createDomElement('div', { class: className }, []));
    }
  }

  return this.framework.createDomElement('div', { id: 'game-grid' }, grid);
}



renderPlayers() {
  this.clearGrid();

  this.players.forEach(player => {
    const gridCells = document.querySelectorAll('.grid-cell');
    const index = player.position.y * this.gridSize + player.position.x;
    const playerImg = document.createElement('img');
    playerImg.src = `assets/bomberman1.png`;
    
    playerImg.classList.add(`player-${player.id}`);
    playerImg.style.width = '40px';
    playerImg.style.height = '40px';
    
    gridCells[index].appendChild(playerImg);  
  });
}

  initGameLogic() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') this.movePlayer('up');
      if (e.key === 'ArrowDown') this.movePlayer('down');
      if (e.key === 'ArrowLeft') this.movePlayer('left');
      if (e.key === 'ArrowRight') this.movePlayer('right');
    });
  }

  movePlayer(direction) {
    const currentPlayer = this.players.find(p => p.id === this.currentPlayerId);
    if (!currentPlayer) return;
  
    let newX = currentPlayer.position.x;
    let newY = currentPlayer.position.y;
  
    // Calculate the new position based on direction
    if (direction === 'up' && newY > 0) newY -= 1;
    if (direction === 'down' && newY < this.gridSize - 1) newY += 1;
    if (direction === 'left' && newX > 0) newX -= 1;
    if (direction === 'right' && newX < this.gridSize - 1) newX += 1;
  
    // Check for collision with indestructible or destructible walls
    if (this.mapLayout[newY][newX] === 1 || this.mapLayout[newY][newX] === 2) {
      // If it's a wall, cancel the movement
      return;
    }
  
    // Update player position if no collision
    currentPlayer.position = { x: newX, y: newY };
  
    // Send player movement to the server via WebSocket
    this.socket.send(JSON.stringify({
      type: 'playerMoved',
      playerId: this.currentPlayerId,
      position: currentPlayer.position
    }));
  
    // Clear previous grid and render players at new position
    this.clearGrid();
    this.renderPlayers();
  }
  

  clearGrid() {
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach(cell => {
      cell.classList.remove('player-1', 'player-2', 'player-3', 'player-4'); 
      cell.innerHTML = '';  
    });
  }
  
  updatePlayerPosition(playerId, position) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.position = position;
      this.clearGrid();
      this.renderPlayers();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const framework = new AppFramework();
  const lobby = new BombermanLobby(framework);
});
