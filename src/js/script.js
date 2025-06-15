// Retro Tetris Game - 80年代レトロテトリス
// ES6準拠の実装

class RetroTetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // ゲーム設定
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.BLOCK_SIZE = 32;
        
        // ゲーム状態
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameRunning = false;
        this.paused = false;
        this.dropTime = 0;
        this.lastTime = 0;
        
        // 音楽設定
        this.audioContext = null;
        this.musicPlaying = false;
        this.currentNote = 0;
        
        // テトロミノの定義
        this.tetrominoes = {
            I: {
                shape: [
                    [0, 0, 0, 0],
                    [1, 1, 1, 1],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ],
                color: '#00FFFF'
            },
            O: {
                shape: [
                    [1, 1],
                    [1, 1]
                ],
                color: '#FFFF00'
            },
            T: {
                shape: [
                    [0, 1, 0],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                color: '#FF00FF'
            },
            S: {
                shape: [
                    [0, 1, 1],
                    [1, 1, 0],
                    [0, 0, 0]
                ],
                color: '#00FF00'
            },
            Z: {
                shape: [
                    [1, 1, 0],
                    [0, 1, 1],
                    [0, 0, 0]
                ],
                color: '#FF0000'
            },
            J: {
                shape: [
                    [1, 0, 0],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                color: '#0000FF'
            },
            L: {
                shape: [
                    [0, 0, 1],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                color: '#FFA500'
            }
        };
        
        // コロベイニキのメロディ (音階番号)
        this.korobeinikiMelody = [
            { note: 64, duration: 0.5 }, // E
            { note: 59, duration: 0.25 }, // B
            { note: 60, duration: 0.25 }, // C
            { note: 62, duration: 0.5 }, // D
            { note: 60, duration: 0.25 }, // C
            { note: 59, duration: 0.25 }, // B
            { note: 57, duration: 0.5 }, // A
            { note: 57, duration: 0.25 }, // A
            { note: 60, duration: 0.25 }, // C
            { note: 64, duration: 0.5 }, // E
            { note: 62, duration: 0.25 }, // D
            { note: 60, duration: 0.25 }, // C
            { note: 59, duration: 0.75 }, // B
            { note: 60, duration: 0.25 }, // C
            { note: 62, duration: 0.5 }, // D
            { note: 64, duration: 0.5 }, // E
            { note: 60, duration: 0.5 }, // C
            { note: 57, duration: 0.5 }, // A
            { note: 57, duration: 1.0 }, // A
        ];
        
        this.init();
    }
    
    init() {
        this.initBoard();
        this.setupEventListeners();
        this.initAudio();
        this.spawnNewPiece();
        this.spawnNextPiece();
        this.gameRunning = true;
        this.gameLoop();
    }
    
    initBoard() {
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('musicToggle').addEventListener('click', () => this.toggleMusic());
    }
    
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.startMusic();
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    }
    
    startMusic() {
        if (!this.audioContext || this.musicPlaying) return;
        
        this.musicPlaying = true;
        this.currentNote = 0;
        this.playNote();
    }
    
    stopMusic() {
        this.musicPlaying = false;
    }
    
    toggleMusic() {
        const button = document.getElementById('musicToggle');
        if (this.musicPlaying) {
            this.stopMusic();
            button.textContent = 'OFF';
        } else {
            this.startMusic();
            button.textContent = 'ON';
        }
    }
    
    playNote() {
        if (!this.musicPlaying || !this.audioContext) return;
        
        const melody = this.korobeinikiMelody;
        const note = melody[this.currentNote];
        
        // Web Audio APIで音を生成
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // MIDIノート番号を周波数に変換
        const frequency = 440 * Math.pow(2, (note.note - 69) / 12);
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'square'; // レトロな矩形波
        
        // エンベロープ設定
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + note.duration);
        
        // 次の音符
        setTimeout(() => {
            this.currentNote = (this.currentNote + 1) % melody.length;
            if (this.musicPlaying) {
                this.playNote();
            }
        }, note.duration * 1000);
    }
    
    spawnNewPiece() {
        if (this.nextPiece) {
            this.currentPiece = { ...this.nextPiece };
        } else {
            this.currentPiece = this.createRandomPiece();
        }
        this.spawnNextPiece();
        
        // ゲームオーバー判定
        if (this.checkCollision(this.currentPiece, 0, 0)) {
            this.gameOver();
        }
    }
    
    spawnNextPiece() {
        this.nextPiece = this.createRandomPiece();
        this.drawNextPiece();
    }
    
    createRandomPiece() {
        const types = Object.keys(this.tetrominoes);
        const type = types[Math.floor(Math.random() * types.length)];
        const tetromino = this.tetrominoes[type];
        
        return {
            shape: tetromino.shape,
            color: tetromino.color,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2),
            y: 0
        };
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning) return;
        
        switch (e.code) {
            case 'ArrowLeft':
                e.preventDefault();
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.movePiece(0, 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.rotatePiece();
                break;
            case 'Space':
                e.preventDefault();
                this.togglePause();
                break;
            case 'KeyR':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) return; // ブラウザリロードを防ぐ
                this.restart();
                break;
        }
    }
    
    movePiece(dx, dy) {
        if (this.paused) return;
        
        if (!this.checkCollision(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            this.draw();
        } else if (dy > 0) {
            // 下への移動で衝突した場合、ピースを固定
            this.placePiece();
        }
    }
    
    rotatePiece() {
        if (this.paused) return;
        
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;
        
        if (this.checkCollision(this.currentPiece, 0, 0)) {
            // 回転できない場合は元に戻す
            this.currentPiece.shape = originalShape;
        } else {
            this.draw();
        }
    }
    
    rotateMatrix(matrix) {
        const n = matrix.length;
        const rotated = Array(n).fill().map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rotated[j][n - 1 - i] = matrix[i][j];
            }
        }
        
        return rotated;
    }
    
    checkCollision(piece, dx, dy) {
        const newX = piece.x + dx;
        const newY = piece.y + dy;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = newX + x;
                    const boardY = newY + y;
                    
                    if (boardX < 0 || boardX >= this.BOARD_WIDTH ||
                        boardY >= this.BOARD_HEIGHT ||
                        (boardY >= 0 && this.board[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    placePiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardX = this.currentPiece.x + x;
                    const boardY = this.currentPiece.y + y;
                    
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
        
        this.clearLines();
        this.spawnNewPiece();
        this.draw();
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // 同じ行を再チェック
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += this.calculateScore(linesCleared);
            this.level = Math.floor(this.lines / 10) + 1;
            this.updateDisplay();
        }
    }
    
    calculateScore(linesCleared) {
        const baseScore = [0, 40, 100, 300, 1200];
        return baseScore[linesCleared] * this.level;
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    togglePause() {
        this.paused = !this.paused;
        const pauseScreen = document.getElementById('pauseScreen');
        if (this.paused) {
            pauseScreen.classList.remove('hidden');
        } else {
            pauseScreen.classList.add('hidden');
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        this.stopMusic();
        document.getElementById('finalScore').textContent = this.score.toLocaleString();
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    restart() {
        this.gameRunning = false;
        this.paused = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.currentNote = 0;
        
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');
        
        this.init();
        this.updateDisplay();
        
        if (document.getElementById('musicToggle').textContent === 'ON') {
            this.startMusic();
        }
    }
    
    gameLoop(currentTime = 0) {
        if (!this.gameRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (!this.paused) {
            this.dropTime += deltaTime;
            const dropInterval = Math.max(50, 1000 - (this.level - 1) * 100);
            
            if (this.dropTime > dropInterval) {
                this.movePiece(0, 1);
                this.dropTime = 0;
            }
        }
        
        this.draw();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    draw() {
        // ボードをクリア
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ボードを描画
        this.drawBoard();
        
        // 現在のピースを描画
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece, this.ctx);
        }
        
        // グリッドを描画
        this.drawGrid();
    }
    
    drawBoard() {
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x], this.ctx);
                }
            }
        }
    }
    
    drawPiece(piece, context) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.drawBlock(piece.x + x, piece.y + y, piece.color, context);
                }
            }
        }
    }
    
    drawBlock(x, y, color, context) {
        const blockSize = context === this.ctx ? this.BLOCK_SIZE : 20;
        const canvasX = x * blockSize;
        const canvasY = y * blockSize;
        
        // メインブロック
        context.fillStyle = color;
        context.fillRect(canvasX, canvasY, blockSize, blockSize);
        
        // ハイライト効果
        context.fillStyle = this.lightenColor(color, 40);
        context.fillRect(canvasX, canvasY, blockSize - 2, 2);
        context.fillRect(canvasX, canvasY, 2, blockSize - 2);
        
        // シャドウ効果
        context.fillStyle = this.darkenColor(color, 40);
        context.fillRect(canvasX + blockSize - 2, canvasY + 2, 2, blockSize - 2);
        context.fillRect(canvasX + 2, canvasY + blockSize - 2, blockSize - 2, 2);
        
        // ボーダー
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 1;
        context.strokeRect(canvasX + 0.5, canvasY + 0.5, blockSize - 1, blockSize - 1);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawNextPiece() {
        if (!this.nextPiece) return;
        
        this.nextCtx.fillStyle = '#000000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const offsetX = (4 - this.nextPiece.shape[0].length) / 2;
        const offsetY = (4 - this.nextPiece.shape.length) / 2;
        
        for (let y = 0; y < this.nextPiece.shape.length; y++) {
            for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
                if (this.nextPiece.shape[y][x]) {
                    this.drawBlock(offsetX + x, offsetY + y, this.nextPiece.color, this.nextCtx);
                }
            }
        }
    }
    
    lightenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new RetroTetris();
});