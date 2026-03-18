import ws281x from 'rpi-ws281x';
import fs from 'node:fs';

import snakeAnimation from './animations/snake.js';
import matrixAnimation from './animations/matrix.js';
import sparkleAnimation from './animations/sparkle.js';
import scannerAnimation from './animations/scanner.js';
import fireAnimation from './animations/fire.js';
import ballsAnimation from './animations/balls.js';
import auroraAnimation from './animations/aurora.js';
import rippleAnimation from './animations/ripple.js';
import textScrollAnimation from './animations/textscroll.js';

const animations = {
  snake: snakeAnimation,
  matrix: matrixAnimation,
  sparkle: sparkleAnimation,
  scanner: scannerAnimation,
  fire: fireAnimation,
  balls: ballsAnimation,
  aurora: auroraAnimation,
  ripple: rippleAnimation,
  textscroll: textScrollAnimation
};

function loadBoardEnv(){
  const envPath = new URL('../.env', import.meta.url);

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for(const rawLine of lines){
      const line = rawLine.trim();
      if(!line || line.startsWith('#')) continue;

      const separator = line.indexOf('=');
      if(separator <= 0) continue;

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');

      if(!(key in process.env)){
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional; defaults below are used when file is missing.
  }
}

function toInt(value, fallback){
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

class systemBoard {
  constructor() {
    this.lastAction = Date.now();
    this.screensaverMode = null;
    this.screensaverRunning = false;
    this.nextScreensaverAllowed = 0;
    this.screensaverStartedAt = 0;
    this.screensaverDuration = 30000;
    this.screensaverBreak = 30000;
    this.activateScreenSaverDuration = 600000;
    this.lastScreensaverMode = null;
    this.animationContexts = {};
    this.statusChangeHandler = null;
  }

  initialize() {
    loadBoardEnv();

    this.screensaverDuration = toInt(process.env.BOARD_SCREENSAVER_DURATION, this.screensaverDuration);
    this.screensaverBreak = toInt(process.env.BOARD_SCREENSAVER_BREAK, this.screensaverBreak);
    this.activateScreenSaverDuration = toInt(process.env.BOARD_SCREENSAVER_IDLE, this.activateScreenSaverDuration);

    /** board config */
    this.boardId = process.env.BOARD_ID || 'PCB';
    this.boardWidth = toInt(process.env.BOARD_WIDTH, 17);
    this.boardHeight = toInt(process.env.BOARD_HEIGHT, 23);
    this.scrollText = process.env.BOARD_SCROLL_TEXT || 'Kakkapylly';

    /** LED config */
    this.config = {};
    this.config.leds = toInt(process.env.BOARD_LED_COUNT, this.boardWidth * this.boardHeight);
    this.config.dma = toInt(process.env.BOARD_DMA, 10);
    this.config.gpio = toInt(process.env.BOARD_GPIO, 18);
    this.config.stripType = (process.env.BOARD_STRIP_TYPE || 'grb').toLowerCase();

    this.boardCols = "abcdefghijklmnopqrstuvwxyz";

    this.boardOffset = this.boardWidth * this.boardHeight - 1 ;
    this.firstColumnReversed = this.boardWidth % 2 === 0;

    this.holdColors = {
      start: "00ff00",
      intermediate: "aa00ff",
      top: "ff0000",
      foot: "a7ceb08"
    };

    ws281x.configure(this.config);
    console.log(`Board started: ${this.boardId}`);
    setInterval(() => this.tick(), 80);
    this.notifyStatusChange('online');
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

    if(this.screensaverMode){
      delete this.animationContexts[this.screensaverMode];
    }

    this.screensaverRunning = false;
    this.screensaverMode = null;
    this.screensaverStartedAt = 0;
    if(!route) return;
    const pixels = new Uint32Array(this.config.leds);
    const holdSetup = route.holdSetup;

    for(let node in holdSetup){
      let ledPosition = this.convertGridPosition(node);
      pixels[ledPosition] = `0x${this.holdColors[holdSetup[node]]}`;
    }
    ws281x.render(pixels);
    this.notifyStatusChange('route-lit');
  }

  /** MAIN LOOP */
  tick() {
    /** start screensaver if idle */
    if(!this.screensaverRunning && Date.now() - this.lastAction > this.activateScreenSaverDuration && Date.now() > this.nextScreensaverAllowed){
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

  setStatusChangeHandler(handler){
    this.statusChangeHandler = handler;
  }

  getStatusSnapshot(){
    return {
      boardId: this.boardId,
      screensaverOn: this.screensaverRunning,
      screensaverMode: this.screensaverMode
    };
  }

  notifyStatusChange(reason = 'state-changed'){
    if(typeof this.statusChangeHandler !== 'function') return;

    this.statusChangeHandler({
      reason,
      ...this.getStatusSnapshot()
    });
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
    this.notifyStatusChange('screensaver-started');
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
    this.notifyStatusChange('screensaver-stopped');
  }
}

export default systemBoard;
