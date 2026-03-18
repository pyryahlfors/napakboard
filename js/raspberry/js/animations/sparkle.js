export default function sparkle(board, pixels){

  if(!board.sparkle){
    board.sparkle = new Array(board.config.leds).fill(0);
  }

  const width = board.boardWidth || 17;
  const height = board.boardHeight || 23;

  for(let i=0;i<board.config.leds;i++){
    board.sparkle[i] *= 0.85;

    if(Math.random() < 0.0015){
      board.sparkle[i] = 1;
    }

    if(board.sparkle[i] > 0){
      let brightness = Math.floor(255*board.sparkle[i]);
      pixels[i] = (brightness<<16)|(brightness<<8)|brightness;

      const ledPosition = ledIndexToXY(board, i, width, height);
      if(ledPosition){
        applyGlow(board, pixels, ledPosition.x, ledPosition.y, width, height, brightness);
      }
    }
  }
}

function applyGlow(board, pixels, x, y, width, height, centerBrightness){
  const glowScale = 0.28;

  for(let dy = -1; dy <= 1; dy++){
    for(let dx = -1; dx <= 1; dx++){
      if(dx === 0 && dy === 0){
        continue;
      }

      const nx = x + dx;
      const ny = y + dy;
      if(nx < 0 || nx >= width || ny < 0 || ny >= height){
        continue;
      }

      const neighborIndex = board.getLedIndex(nx, ny);
      if(neighborIndex < 0 || neighborIndex >= pixels.length){
        continue;
      }

      const distance = Math.abs(dx) + Math.abs(dy);
      const falloff = distance === 1 ? glowScale : glowScale * 0.55;
      const glow = Math.floor(centerBrightness * falloff);
      if(glow <= 0){
        continue;
      }

      addWhite(pixels, neighborIndex, glow);
    }
  }
}

function addWhite(pixels, index, addValue){
  const current = pixels[index];
  const brightness = (current >> 16) & 0xFF;
  const newBrightness = Math.min(255, brightness + addValue);
  pixels[index] = (newBrightness<<16)|(newBrightness<<8)|newBrightness;
}

function ledIndexToXY(board, ledIndex, width, height){
  for(let x = 0; x < width; x++){
    for(let y = 0; y < height; y++){
      if(board.getLedIndex(x, y) === ledIndex){
        return { x, y };
      }
    }
  }

  return null;
}
