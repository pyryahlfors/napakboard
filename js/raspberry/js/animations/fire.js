export default function fire(board, pixels){

  if(!board.fire){
    board.fire = new Array(board.config.leds).fill(0);
    board.fireFrame = 0;

    // Store base flame height per column (0 to 1/3 of board height)
    const maxFlameHeight = Math.floor(board.boardHeight / 3);
    board.fireMaxHeight = maxFlameHeight;
    board.fireBaseHeights = new Array(board.boardWidth);
    board.firePhases = new Array(board.boardWidth);
    board.fireTargetHeights = new Array(board.boardWidth);
    board.fireCurrentHeights = new Array(board.boardWidth);
    for(let x = 0; x < board.boardWidth; x++){
      const baseHeight = Math.random() * maxFlameHeight;
      board.fireBaseHeights[x] = baseHeight;
      board.firePhases[x] = Math.random() * Math.PI * 2;
      board.fireTargetHeights[x] = baseHeight;
      board.fireCurrentHeights[x] = baseHeight * 0.6;
    }
  }

  const flameHeights = new Array(board.boardWidth);

  // Update flame heights per column so they visibly grow and shrink over time.
  for(let x = 0; x < board.boardWidth; x++){
    const phase = board.firePhases[x];
    const slowWave = Math.sin(board.fireFrame * 0.03 + phase) * 0.5 + 0.5;
    const fastWave = Math.sin(board.fireFrame * 0.11 + phase * 1.7) * 0.5 + 0.5;

    if(board.fireFrame % 8 === 0 || Math.random() < 0.03){
      const targetHeight = board.fireBaseHeights[x] * 0.35
        + slowWave * board.fireMaxHeight * 0.45
        + fastWave * board.fireMaxHeight * 0.2
        + (Math.random() * 2 - 1);

      board.fireTargetHeights[x] = Math.max(0, Math.min(board.fireMaxHeight, targetHeight));
    }

    board.fireCurrentHeights[x] += (board.fireTargetHeights[x] - board.fireCurrentHeights[x]) * 0.22;
    flameHeights[x] = Math.max(0, Math.round(board.fireCurrentHeights[x]));

    const baseLed = board.getLedIndex(x, board.boardHeight - 1);
    const heightIntensity = flameHeights[x] / Math.max(1, board.fireMaxHeight);
    board.fire[baseLed] = 95 + heightIntensity * 110 + Math.random() * 30;
  }

  // Propagate and cool fire, but only up to dynamic max height per column
  for(let y = board.boardHeight - 1; y > 0; y--){
    for(let x = 0; x < board.boardWidth; x++){
      const dynamicHeight = flameHeights[x];
      const maxY = board.boardHeight - 1 - dynamicHeight;
      const currentLed = board.getLedIndex(x, y);

      if(y <= maxY){
        board.fire[currentLed] *= 0.45;
        continue;
      }

      const belowLed = board.getLedIndex(x, y - 1);

      const turbulence = Math.random() * 14 - 7;
      board.fire[belowLed] = board.fire[currentLed] * 0.82 + turbulence;
      board.fire[belowLed] = Math.min(255, Math.max(0, board.fire[belowLed]));
    }
  }

  // Render fire with color gradient (red -> yellow)
  for(let i = 0; i < board.config.leds; i++){
    const heat = board.fire[i];
    if(heat < 20) continue;

    let r, g, b;
    if(heat < 85){
      r = Math.floor(heat * 3);
      g = 0;
      b = 0;
    } else if(heat < 170){
      r = 255;
      g = Math.floor((heat - 85) * 3);
      b = 0;
    } else {
      r = 255;
      g = 255;
      b = Math.floor((heat - 170) * 1.5);
    }

    pixels[i] = (r << 16) | (g << 8) | b;
  }

  board.fireFrame++;
}
