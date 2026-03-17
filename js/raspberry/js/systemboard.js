import ws281x from 'rpi-ws281x';

import snakeAnimation from './animations/snake.js';
import matrixAnimation from './animations/matrix.js';
import sparkleAnimation from './animations/sparkle.js';
import scannerAnimation from './animations/scanner.js';
import fireAnimation from './animations/fire.js';
import ballsAnimation from './animations/balls.js';
import auroraAnimation from './animations/aurora.js';

const animations = {
  snake: snakeAnimation,
  matrix: matrixAnimation,
  sparkle: sparkleAnimation,
  scanner: scannerAnimation,
  fire: fireAnimation,
  balls: ballsAnimation,
  aurora: auroraAnimation
};

class systemBoard {
  constructor() {
    this.lastAction = Date.now();
    this.screensaverMode = null;
    this.screensaverRunning = false;
    this.nextScreensaverAllowed = 0;
    this.screensaverStartedAt = 0;
    this.screensaverDuration = 30000;
    this.screensaverBreak = 30000;
    this.lastScreensaverMode = null;
    this.animationContexts = {};
  }

  initialize() {
    /** LED config */
    this.config = {};
    this.config.leds = 399;
    this.config.dma = 10;
    this.config.gpio = 18;
    this.config.stripType = 'grb';

    /** board config */
    this.boardId = "PCB";
    this.boardWidth = 17;
    this.boardHeight = 23;

    this.boardCols = "abcdefghijklmnopqrstuvwxyz";

    this.boardOffset = this.boardWidth * this.boardHeight - 1 ;
    this.firstColumnReversed = this.boardWidth % 2 === 0;

    this.snakeLength = 10;

    this.holdColors = {
      start: "00ff00",
      intermediate: "aa00ff",
      top: "ff0000",
      foot: "a7ceb08"
    };

    ws281x.configure(this.config);
    console.log(`Board started: ${this.boardId}`);
    setInterval(() => this.tick(), 80);
  }

  /** LED GRID MAPPING */
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

    return this.getLedIndex(x, y);
  }

  /** ROUTE LIGHTING */
  lit(route) {
    this.lastAction = Date.now();
    this.screensaverRunning = false;
    if(!route) return;
    const pixels = new Uint32Array(this.config.leds);
    const holdSetup = route.holdSetup;

    for(let node in holdSetup){
      let ledPosition = this.convertGridPosition(node);
      pixels[ledPosition] = `0x${this.holdColors[holdSetup[node]]}`;
    }
    ws281x.render(pixels);
  }

  /** MAIN LOOP */
  tick() {
    /** start screensaver if idle */
    if(!this.screensaverRunning && Date.now() - this.lastAction > 600000 && Date.now() > this.nextScreensaverAllowed){
      this.startScreensaver();
    }

    if(!this.screensaverRunning) return;

    if(Date.now() - this.screensaverStartedAt >= this.screensaverDuration){
      this.stopScreensaver();
      return;
    }

    const pixels = new Uint32Array(this.config.leds);
    const anim = animations[this.screensaverMode];
    const animBoard = this.getAnimationContext(this.screensaverMode);

    if(anim) anim(animBoard, pixels);

    ws281x.render(pixels);
  }

  getAnimationContext(mode){
    if(!mode) return this;

    if(!this.animationContexts[mode]){
      this.animationContexts[mode] = Object.create(this);
    }

    return this.animationContexts[mode];
  }

  /** SCREENSAVER */
  startScreensaver(){
    const modes = Object.keys(animations);
    const availableModes = modes.length > 1
      ? modes.filter((mode) => mode !== this.lastScreensaverMode)
      : modes;

    this.screensaverMode = availableModes[Math.floor(Math.random() * availableModes.length)];
    this.screensaverRunning = true;
    this.screensaverStartedAt = Date.now();
    console.log(`Running ${this.screensaverMode} animation`);
  }

  stopScreensaver(){
    console.log("Stop animation");
    this.lastScreensaverMode = this.screensaverMode;

    if(this.screensaverMode){
      delete this.animationContexts[this.screensaverMode];
    }

    this.screensaverRunning = false;
    this.screensaverMode = null;
    this.screensaverStartedAt = 0;
    this.nextScreensaverAllowed = Date.now() + this.screensaverBreak;

    /** clear board */
    const pixels = new Uint32Array(this.config.leds);
    ws281x.render(pixels);
  }
}

export default systemBoard;
