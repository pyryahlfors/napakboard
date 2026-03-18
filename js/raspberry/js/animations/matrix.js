import { rgbToGrb } from './colorUtils.js';

export default function matrix(board, pixels){

  if(!board.matrixDrops){

    board.matrixDrops = new Array(board.boardWidth).fill(-1);
    board.matrixStepEvery = new Array(board.boardWidth).fill(1);
    board.matrixStepCountdown = new Array(board.boardWidth).fill(1);
    board.matrixFrame = 0;
  }

  for(let col=0; col<board.boardWidth; col++){

    let row = board.matrixDrops[col];

    // Only start new drops from columns that are ready
    if(row === -1 && Math.random() < 0.05){
      board.matrixDrops[col] = 0;
      board.matrixStepEvery[col] = 1 + Math.floor(Math.random() * 3); // 1..3 ticks per step
      board.matrixStepCountdown[col] = board.matrixStepEvery[col];
      row = 0;
    }

    // Render while falling and while fading out (5 frames past bottom)
    if(row >= 0 && row < board.boardHeight + 5){

      for(let t=0;t<5;t++){

        let r = row - t;
        if(r < 0) continue;
        if(r >= board.boardHeight) continue; // Don't render above board during fade

        let led = board.getLedIndex(col,r);
        let brightness = 1 - t/5;

        // Fade out when past the bottom
        if(row >= board.boardHeight){
          brightness *= Math.max(0, 1 - (row - board.boardHeight) / 5);
        }

        let g = Math.floor(255*brightness);
        pixels[led] = rgbToGrb(0, g, 0); // GREEN (GRB format)
      }

      board.matrixStepCountdown[col]--;
      if(board.matrixStepCountdown[col] <= 0){
        board.matrixDrops[col]++;
        board.matrixStepCountdown[col] = board.matrixStepEvery[col];
      }
    } else if(row >= board.boardHeight + 5){
      // Reset column after fade is complete so new drops can start
      board.matrixDrops[col] = -1;
      board.matrixStepEvery[col] = 1;
      board.matrixStepCountdown[col] = 1;
    }
  }

  board.matrixFrame++;
}
