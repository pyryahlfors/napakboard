import ws281x from 'rpi-ws281x';
import fs from 'node:fs';

import snakeAnimation from './animations/snake.js';
import matrixAnimation from './animations/matrix.js';
import sparkleAnimation from './animations/sparkle.js';
import auroraAnimation from './animations/aurora.js';
import rippleAnimation from './animations/ripple.js';

const animations = {
  snake: snakeAnimation,
  matrix: matrixAnimation,
  sparkle: sparkleAnimation,
  aurora: auroraAnimation,
  ripple: rippleAnimation
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
    this.trainingActive = false;
    this.trainingAnimationTimer = null;
    this.trainingRest = null;
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

  litTrainingGroup(holdSetup, holdIds, recentHoldIds = holdIds) {
    this.trainingRest = null;
    this.lastAction = Date.now();
    if(this.trainingAnimationTimer !== null) {
      clearTimeout(this.trainingAnimationTimer);
      this.trainingAnimationTimer = null;
    }
    if(this.screensaverMode) {
      delete this.animationContexts[this.screensaverMode];
    }
    this.screensaverRunning = false;
    this.screensaverMode = null;
    this.screensaverStartedAt = 0;

    const zoomFrames = [
      [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]],
      [[0, -1], [-1, 0], [1, 0], [0, 1]],
      [[0, 0]]
    ];
    const activeHoldIds = new Set(holdIds);
    const holdColors = new Map();

    for(const holdId of recentHoldIds) {
      const hold = holdSetup[holdId];
      const holdType = typeof hold === 'string' ? hold : hold && hold.type;
      const color = this.holdColors[holdType] || 'ffffff';
      const pixelColor = Number.parseInt(String(color).replace(/^#|^0x/i, ''), 16);
      if(Number.isFinite(pixelColor)) holdColors.set(holdId, pixelColor & 0xffffff);
    }

    const renderZoomFrame = (frameIndex) => {
      const pixels = new Uint32Array(this.config.leds);
      for(const holdId of recentHoldIds) {
        const color = holdColors.get(holdId);
        if(color === undefined) continue;

        const match = holdId.match(/[a-zA-Z]+|[0-9]+/g);
        if(!match) continue;
        const x = this.boardCols.indexOf(match[0].toLowerCase());
        const y = Number(match[1]) - 1;
        const offsets = activeHoldIds.has(holdId) ? zoomFrames[frameIndex] : [[0, 0]];

        for(const [offsetX, offsetY] of offsets) {
          const column = x + offsetX;
          const row = y + offsetY;
          if(column < 0 || column >= this.boardWidth || row < 0 || row >= this.boardHeight) continue;
          const ledIndex = this.getLedIndex(column, row);
          if(ledIndex >= 0 && ledIndex < pixels.length) pixels[ledIndex] = color;
        }
      }
      ws281x.render(pixels);
    };

    let frameIndex = 0;
    renderZoomFrame(frameIndex);
    const frameDelayMs = 90;
    const advanceZoom = () => {
      if(frameIndex >= zoomFrames.length - 1) {
        this.trainingAnimationTimer = null;
        return;
      }
      frameIndex += 1;
      renderZoomFrame(frameIndex);
      this.trainingAnimationTimer = setTimeout(advanceZoom, frameDelayMs);
    };
    this.trainingAnimationTimer = setTimeout(advanceZoom, frameDelayMs);
    this.notifyStatusChange('training-step-lit');
    return frameDelayMs * (zoomFrames.length - 1);
  }

  litTrainingRest(durationMs, deadline) {
    this.trainingRest = {durationMs, deadline, remainingMs: 0, paused: false};
    this.renderTrainingRest();
  }

  pauseTrainingRest(remainingMs) {
    if(!this.trainingRest) return;
    this.trainingRest.remainingMs = remainingMs;
    this.trainingRest.paused = true;
    this.renderTrainingRest();
  }

  renderTrainingRest() {
    const rest = this.trainingRest;
    if(!rest) return;
    const remainingMs = rest.paused ? rest.remainingMs : Math.max(0, rest.deadline - Date.now());
    const progress = rest.durationMs > 0 ? Math.min(1, Math.max(0, remainingMs / rest.durationMs)) : 0;
    const litColumns = Math.ceil(this.boardWidth * progress);
    const pixels = new Uint32Array(this.config.leds);

    for(let column = 0; column < litColumns; column++) {
      const ledIndex = this.getLedIndex(column, this.boardHeight - 1);
      if(ledIndex >= 0 && ledIndex < pixels.length) pixels[ledIndex] = 0xffffff;
    }
    ws281x.render(pixels);
  }

  clearLights(reason = 'training-cleared') {
    this.trainingRest = null;
    this.lastAction = Date.now();
    if(this.trainingAnimationTimer !== null) {
      clearTimeout(this.trainingAnimationTimer);
      this.trainingAnimationTimer = null;
    }
    if(this.screensaverMode) {
      delete this.animationContexts[this.screensaverMode];
    }
    this.screensaverRunning = false;
    this.screensaverMode = null;
    this.screensaverStartedAt = 0;
    ws281x.render(new Uint32Array(this.config.leds));
    this.notifyStatusChange(reason);
  }

  /** ROUTE LIGHTING */
  lit(route) {
    this.trainingRest = null;
    this.lastAction = Date.now();
    if(this.trainingAnimationTimer !== null) {
      clearTimeout(this.trainingAnimationTimer);
      this.trainingAnimationTimer = null;
    }

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
    if(this.trainingActive) {
      if(this.trainingRest && !this.trainingRest.paused) this.renderTrainingRest();
      return;
    }

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
