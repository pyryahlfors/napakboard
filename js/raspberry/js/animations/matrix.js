export default function matrix(board, pixels){

  if(!board.matrixDrops){

    board.matrixDrops = new Array(board.boardWidth).fill(-1);
    board.matrixFrame = 0;
  }

  for(let col=0; col<board.boardWidth; col++){

    if(board.matrixDrops[col] === -1 && Math.random() < 0.05)
      board.matrixDrops[col] = 0;

    let row = board.matrixDrops[col];

    if(row >= 0){

      for(let t=0;t<5;t++){

        let r = row - t;
        if(r < 0) continue;
        let led = board.getLedIndex(col,r);
        let brightness = 1 - t/5;
        let g = Math.floor(255*brightness);
        pixels[led] = (g<<16); // GREEN
      }

      board.matrixDrops[col]++;

      if(board.matrixDrops[col] > board.boardHeight+5)
        board.matrixDrops[col] = -1;
    }
  }

  board.matrixFrame++;

  if(board.matrixFrame > 260){
    board.matrixDrops = null;
    board.stopScreensaver();
  }
}
