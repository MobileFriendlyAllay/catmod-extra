(function(Scratch) {
  'use strict';

  class TetrisExtension {
    constructor() {
      // Game State
      this.grid = [];
      this.rows = 20;
      this.cols = 10;
      this.currentPiece = null;
      this.isPaused = false;
      this.gameOver = false;
      this.linesCleared = 0;
      
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      // Gravity State
      this.fallInterval = 1000; // Default 1 second
      this.lastFallTime = 0;

      // Tetromino Definitions
      this.SHAPES = {
        I: [[1, 1, 1, 1]],
        J: [[1, 0, 0], [1, 1, 1]],
        L: [[0, 0, 1], [1, 1, 1]],
        O: [[1, 1], [1, 1]],
        S: [[0, 1, 1], [1, 1, 0]],
        T: [[0, 1, 0], [1, 1, 1]],
        Z: [[1, 1, 0], [0, 1, 1]]
      };

      this.COLORS = {
        I: '#00f0f0',
        J: '#0000f0',
        L: '#f0a000',
        O: '#f0f000',
        S: '#00f000',
        T: '#a000f0',
        Z: '#f00000'
      };

      // Start the internal game loop for gravity
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    _loop(t) {
      if (!this.isPaused && !this.gameOver && this.currentPiece) {
        if (t - this.lastFallTime > this.fallInterval) {
          this.movePiece({ DIR: 'down' });
          this.lastFallTime = t;
        }
      } else {
        this.lastFallTime = t;
      }
      requestAnimationFrame(this._loop);
    }

    getInfo() {
      return {
        id: 'tetrisEngine',
        name: 'Tetris Engine',
        blocks: [
          {
            opcode: 'resetGame',
            blockType: Scratch.BlockType.COMMAND,
            text: 'reset Tetris with grid rows [ROWS] cols [COLS]',
            arguments: {
              ROWS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
              COLS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 }
            }
          },
          {
            opcode: 'setFallSpeed',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set fall speed to [SPEED] seconds',
            arguments: {
              SPEED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'togglePause',
            blockType: Scratch.BlockType.COMMAND,
            text: 'toggle pause Tetris'
          },
          {
            opcode: 'movePiece',
            blockType: Scratch.BlockType.COMMAND,
            text: 'move piece [DIR]',
            arguments: {
              DIR: {
                type: Scratch.ArgumentType.STRING,
                menu: 'directionMenu',
                defaultValue: 'left'
              }
            }
          },
          {
            opcode: 'rotatePiece',
            blockType: Scratch.BlockType.COMMAND,
            text: 'rotate piece'
          },
          {
            opcode: 'hardDrop',
            blockType: Scratch.BlockType.COMMAND,
            text: 'hard drop piece'
          },
          {
            opcode: 'getLinesCleared',
            blockType: Scratch.BlockType.REPORTER,
            text: 'total lines cleared'
          },
          {
            opcode: 'getFrameData',
            blockType: Scratch.BlockType.REPORTER,
            text: 'current Tetris frame image'
          },
          '---',
          {
            opcode: 'onClear',
            blockType: Scratch.BlockType.HAT,
            text: 'when [TYPE] lines cleared',
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'clearMenu',
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'onGameOver',
            blockType: Scratch.BlockType.HAT,
            text: 'when game is lost'
          }
        ],
        menus: {
          directionMenu: {
            acceptReporters: true,
            items: ['left', 'right', 'down']
          },
          clearMenu: {
            acceptReporters: false,
            items: [
              { text: 'single', value: '1' },
              { text: 'double', value: '2' },
              { text: 'triple', value: '3' },
              { text: 'quadruple (Tetris)', value: '4' }
            ]
          }
        }
      };
    }

    resetGame({ ROWS, COLS }) {
      this.rows = Math.max(4, Math.min(100, ROWS));
      this.cols = Math.max(4, Math.min(100, COLS));
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
      this.isPaused = false;
      this.gameOver = false;
      this.linesCleared = 0;
      this.lastFallTime = performance.now();
      this.spawnPiece();
    }

    setFallSpeed({ SPEED }) {
      this.fallInterval = Math.max(0.05, SPEED) * 1000;
    }

    togglePause() {
      this.isPaused = !this.isPaused;
    }

    getLinesCleared() {
      return this.linesCleared;
    }

    spawnPiece() {
      const keys = Object.keys(this.SHAPES);
      const type = keys[Math.floor(Math.random() * keys.length)];
      const shape = this.SHAPES[type];
      this.currentPiece = {
        type,
        shape,
        x: Math.floor(this.cols / 2) - Math.floor(shape[0].length / 2),
        y: 0
      };

      if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, shape)) {
        this.gameOver = true;
      }
    }

    checkCollision(x, y, shape) {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            let newX = x + c;
            let newY = y + r;
            if (newX < 0 || newX >= this.cols || newY >= this.rows || (newY >= 0 && this.grid[newY][newX])) {
              return true;
            }
          }
        }
      }
      return false;
    }

    lockPiece() {
      const { shape, x, y, type } = this.currentPiece;
      shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            if (y + r >= 0) this.grid[y + r][x + c] = type;
          }
        });
      });
      this.clearLines();
      if (!this.gameOver) {
        this.spawnPiece();
      }
    }

    clearLines() {
      let linesThisTurn = 0;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r].every(cell => cell !== 0)) {
          this.grid.splice(r, 1);
          this.grid.unshift(Array(this.cols).fill(0));
          linesThisTurn++;
          r++; 
        }
      }
      
      if (linesThisTurn > 0) {
        this.linesCleared += linesThisTurn;
        // Trigger the specific clear event
        this.lastClearedCount = linesThisTurn;
      }
    }

    // Event Hat Logic
    onClear(args) {
      const target = parseInt(args.TYPE);
      if (this.lastClearedCount === target) {
        this.lastClearedCount = 0; // Consume event
        return true;
      }
      return false;
    }

    onGameOver() {
      if (this.gameOver && !this._notifiedGameOver) {
        this._notifiedGameOver = true;
        return true;
      }
      if (!this.gameOver) {
        this._notifiedGameOver = false;
      }
      return false;
    }

    movePiece({ DIR }) {
      if (this.isPaused || this.gameOver || !this.currentPiece) return;
      let dx = 0, dy = 0;
      if (DIR === 'left') dx = -1;
      if (DIR === 'right') dx = 1;
      if (DIR === 'down') dy = 1;

      if (!this.checkCollision(this.currentPiece.x + dx, this.currentPiece.y + dy, this.currentPiece.shape)) {
        this.currentPiece.x += dx;
        this.currentPiece.y += dy;
        if (dy === 1) this.lastFallTime = performance.now();
      } else if (dy === 1) {
        this.lockPiece();
      }
    }

    rotatePiece() {
      if (this.isPaused || this.gameOver || !this.currentPiece) return;
      const s = this.currentPiece.shape;
      const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
      if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, rotated)) {
        this.currentPiece.shape = rotated;
      }
    }

    hardDrop() {
      if (this.isPaused || this.gameOver || !this.currentPiece) return;
      while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
        this.currentPiece.y++;
      }
      this.lockPiece();
    }

    getFrameData() {
      if (this.grid.length === 0) {
        this.canvas.width = 1;
        this.canvas.height = 1;
        this.ctx.clearRect(0, 0, 1, 1);
        return this.canvas.toDataURL('image/png');
      }

      const tileSize = 20;
      this.canvas.width = this.cols * tileSize;
      this.canvas.height = this.rows * tileSize;
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c]) {
            this.ctx.fillStyle = this.COLORS[this.grid[r][c]];
            this.ctx.fillRect(c * tileSize, r * tileSize, tileSize - 1, tileSize - 1);
          }
        }
      }

      if (this.currentPiece && !this.gameOver) {
        this.ctx.fillStyle = this.COLORS[this.currentPiece.type];
        this.currentPiece.shape.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell) {
              this.ctx.fillRect(
                (this.currentPiece.x + c) * tileSize,
                (this.currentPiece.y + r) * tileSize,
                tileSize - 1,
                tileSize - 1
              );
            }
          });
        });
      }

      if (this.gameOver) {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }

      return this.canvas.toDataURL('image/png');
    }
  }

  Scratch.extensions.register(new TetrisExtension());
})(Scratch);
