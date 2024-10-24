class BombermanLobby {
  constructor(framework) {
    this.framework = framework;
    this.playerCount = 0;
    this.maxPlayers = 4;
    this.socket = null;
    this.players = [];
    this.currentPlayerId = null;  // The ID of the current player (set by the server)
    this.gridSize = 10;  // Define the grid size for the game
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
      this.framework.createDomElement('h1', {}, ['Bomberman Lobby']),
      this.framework.createDomElement('p', { id: 'player-count' }, [`Waiting for players... 0/${this.maxPlayers}`]),
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

      if (data.type === 'assignPlayerId') {
        this.currentPlayerId = data.playerId;  // Set the current player's ID
      } else if (data.type === 'playerCountUpdate') {
        this.updatePlayerCount(data.playerCount);
      } else if (data.type === 'startGame') {
        this.startGame(data.players);
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



  updatePlayerCount(count) {
    this.playerCount = count;
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
      playerCountElement.textContent = `Waiting for players... ${this.playerCount}/${this.maxPlayers}`;
    }
  }

  startGame(players) {
    this.players = players;
    console.log('Game starting...');
    this.framework.renderDomTree(this.createGameView(), document.getElementById('app'));
    this.initGameLogic();  // Initialize player movement
    this.renderPlayers();  // Initial render of players
  }

  createGameView() {
    return this.framework.createDomElement('div', { id: 'game-grid', style: 'display: grid; grid-template-columns: repeat(10, 40px); grid-gap: 5px;' },
      Array(this.gridSize * this.gridSize).fill().map(() => this.framework.createDomElement('div', { class: 'grid-cell' }, []))
    );
  }

  initGameLogic() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') this.movePlayer('up');
      if (e.key === 'ArrowDown') this.movePlayer('down');
      if (e.key === 'ArrowLeft') this.movePlayer('left');
      if (e.key === 'ArrowRight') this.movePlayer('right');
    });
  }

  renderPlayers() {
    this.players.forEach(player => {
      const gridCells = document.querySelectorAll('.grid-cell');
      const index = player.position.y * this.gridSize + player.position.x;
      gridCells[index].style.backgroundColor = 'blue';  // Set the player's cell color (e.g., blue)
      gridCells[index].textContent = player.nickname;
    });
  }

  movePlayer(direction) {
    const currentPlayer = this.players.find(p => p.id === this.currentPlayerId);
    if (!currentPlayer) return;

    if (direction === 'up' && currentPlayer.position.y > 0) currentPlayer.position.y -= 1;
    if (direction === 'down' && currentPlayer.position.y < this.gridSize - 1) currentPlayer.position.y += 1;
    if (direction === 'left' && currentPlayer.position.x > 0) currentPlayer.position.x -= 1;
    if (direction === 'right' && currentPlayer.position.x < this.gridSize - 1) currentPlayer.position.x += 1;

    this.socket.send(JSON.stringify({
      type: 'playerMoved',
      playerId: this.currentPlayerId,
      position: currentPlayer.position
    }));

    this.clearGrid();
    this.renderPlayers();
  }

  clearGrid() {
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach(cell => {
      cell.style.backgroundColor = '';  // Reset background color
      cell.textContent = '';  // Clear any text
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