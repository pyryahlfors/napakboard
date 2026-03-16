import ws281x from 'rpi-ws281x';

import snakeAnimation from './animations/snake.js';
import matrixAnimation from './animations/matrix.js';
import sparkleAnimation from './animations/sparkle.js';

class systemBoard {
  constructor() {
    this.lastAction = Date.now();
    this.screensaverMode = null;
    this.screensaverRunning = false;
    this.nextScreensaverAllowed = 0;
  }

  initialize() {
    this.boardId = 'PCB';

	this.config = {};
    this.config.leds = 399;
    this.config.dma = 10;
    this.config.gpio = 18;
    this.config.stripType = 'grb';

    /** board geometry */
    this.boardWidth = 17;
    this.boardHeight = 23;
    this.boardCols = "abcdefghijklmnopqrstuvwxyz";
    this.boardOffset = 390;
    this.firstColumnReversed = this.boardWidth % 2 === 0;
    this.snakeLength = 10;

    this.holdColors = {
      'start'        : '00ff00',
      'intermediate' : 'aa00ff',
      'top'          : 'ff0000',
      'foot'         : 'a7ceb08'
    }

    ws281x.configure(this.config);
      setInterval(() => this.tick(), 80);
  }

  getLedIndex(x, y) {
    let reversed = this.firstColumnReversed ? x % 2 === 0 : x % 2 !== 0;
   let row = reversed ? this.boardHeight - 1 - y : y;
    let led = (x * this.boardHeight) + row;
    return Math.abs(led - this.boardOffset);
  }

  convertGridPosition = (pos) => {
    let grid = pos.match(/[a-zA-Z]+|[0-9]+/g);
    let x = this.boardCols.indexOf(grid[0]);
    let y = Number(grid[1]) - 1;

    return this.getLedIndex(x,y);
  }

  clearBoard() {
        const pixels = new Uint32Array(this.config.leds);
        ws281x.render(pixels);
        }

  lit(route) {
    this.lastAction = Date.now();
    this.screensaverRunning = false;

    if(route) {
      let pixels = new Uint32Array(this.config.leds);
      const holdSetup = route.holdSetup;

      for(let node in holdSetup){
        let ledPosition = this.convertGridPosition(node);
        pixels[ledPosition] = `0x${this.holdColors[holdSetup[node]]}`;
      }
     ws281x.render(pixels);
    }
  }

  tick() {
    if(!this.screensaverRunning && Date.now() - this.lastAction > 600000 && Date.now() > this.nextScreensaverAllowed) {
      this.startScreensaver();
    }

    if(!this.screensaverRunning) return;

    const pixels = new Uint32Array(this.config.leds);

    if(this.screensaverMode === "snake") snakeAnimation(this, pixels);
    if(this.screensaverMode === "matrix") matrixAnimation(this, pixels);
    if(this.screensaverMode === "sparkle") sparkleAnimation(this, pixels);

    // animation may have stopped during the frame
    if(!this.screensaverRunning) return;

    ws281x.render(pixels);
  }

  startScreensaver(){
    const modes = ["snake","matrix","sparkle"];
    this.screensaverMode = modes[Math.floor(Math.random()*modes.length)];
    this.screensaverRunning = true;

    console.log(`Running ${this.screensaverMode} animation`);

    this.snakeInit?.();
    this.matrixInit?.();
    this.sparkleInit?.();
  }

  stopScreensaver(){
        console.log('Stop animation');

        this.snakeBody = null;
        this.matrixDrops = null;
        this.sparkle = null;

        this.screensaverRunning = false;
        this.nextScreensaverAllowed = Date.now() + 30000;

        this.clearBoard();
        }
}

export default systemBoard;
