export default function matrix(board, pixels){

  if(!board.matrixDrops){

    board.matrixDrops = new Array(board.boardWidth).fill(-1);
    board.matrixFrame = 0;
  }

  for(let col=0; col<board.boardWidth; col++){

    let row = board.matrixDrops[col];

    // Only start new drops from columns that are ready
    if(row === -1 && Math.random() < 0.05){
      board.matrixDrops[col] = 0;
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
        pixels[led] = (g<<16); // GREEN
      }

      board.matrixDrops[col]++;
    } else if(row >= board.boardHeight + 5){
      // Reset column after fade is complete so new drops can start
      board.matrixDrops[col] = -1;
    }
  }

  board.matrixFrame++;
}
