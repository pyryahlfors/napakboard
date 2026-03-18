import { rgbToGrb } from './colorUtils.js';

export default function aurora(board, pixels){

  if(board.auroraTime === undefined){
    board.auroraTime = 0;
  }

  const centerA = (Math.sin(board.auroraTime * 0.025) * 0.5 + 0.5) * (board.boardHeight - 1);

  for(let x = 0; x < board.boardWidth; x++){
    for(let y = 0; y < board.boardHeight; y++){
      const driftA = Math.sin(board.auroraTime * 0.045 + x * 0.22) * 2.6;
      const bandA = Math.max(0, 1 - Math.abs(y - (centerA + driftA)) / 3.2);
      const shimmer = Math.sin(board.auroraTime * 0.06 + x * 0.35 + y * 0.18) * 0.12 + 0.88;

      let brightness = bandA * shimmer;
      brightness = Math.pow(brightness, 0.9);

      if(brightness > 0.18){
        const colorShift = Math.sin(board.auroraTime * 0.02 + x * 0.15) * 0.5 + 0.5;

        let r, g, b;

        if(colorShift < 0.33){
          r = Math.floor(brightness * 80);
          g = Math.floor(brightness * 255);
          b = Math.floor(brightness * 150);
        } else if(colorShift < 0.66){
          r = Math.floor(brightness * 100);
          g = Math.floor(brightness * 240);
          b = Math.floor(brightness * 200);
        } else {
          r = Math.floor(brightness * 200);
          g = Math.floor(brightness * 100);
          b = Math.floor(brightness * 255);
        }

        const led = board.getLedIndex(x, y);
        pixels[led] = rgbToGrb(r, g, b);
      }
    }
  }

  board.auroraTime++;
}
