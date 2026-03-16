export default function sparkle(board, pixels){

  if(!board.sparkle){
    board.sparkle = new Array(board.config.leds).fill(0);
    board.sparkleFrame = 0;
  }

  for(let i=0;i<board.config.leds;i++){
    board.sparkle[i] *= 0.92;

    if(Math.random() < 0.001) board.sparkle[i] = 1;

    if(board.sparkle[i] > 0.05){
      let v = Math.floor(255*board.sparkle[i]);
      pixels[i] = (v<<16)|(v<<8)|v;
    }
  }

  board.sparkleFrame++;

  if(board.sparkleFrame > 200){
    board.sparkle = null;
    board.stopScreensaver();
  }
}
