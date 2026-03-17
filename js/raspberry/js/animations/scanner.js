export default function scanner(board, pixels){

  if(board.scanRow === undefined){
    board.scanRow = 0;
    board.scanFrame = 0;
    board.scanHits = []; // Track lit-up objects that are fading
  }

  // Draw horizontal scanner line
  for(let x = 0; x < board.boardWidth; x++){
    const led = board.getLedIndex(x, board.scanRow);
    pixels[led] = 0xFF0000; // Red line
  }

  // Draw fading trails behind the line
  for(let trail = 1; trail <= 3; trail++){
    const trailRow = (board.scanRow - trail + board.boardHeight) % board.boardHeight;
    for(let x = 0; x < board.boardWidth; x++){
      const led = board.getLedIndex(x, trailRow);
      const brightness = Math.floor(255 * (1 - trail / 4));
      pixels[led] = (brightness << 16); // Fading red
    }
  }

  // Randomly spawn new hits as scanner passes
  for(let x = 0; x < board.boardWidth; x++){
    if(Math.random() < 0.03){
      board.scanHits.push({
        x: x,
        y: board.scanRow,
        life: 40 // Frames until fully faded
      });
    }
  }

  // Update and render all hits
  for(let i = board.scanHits.length - 1; i >= 0; i--){
    const hit = board.scanHits[i];
    const brightness = Math.floor((hit.life / 40) * 255);
    const led = board.getLedIndex(hit.x, hit.y);

    // Cyan color fading out
    pixels[led] = (0 << 16) | (brightness << 8) | brightness;

    hit.life--;
    if(hit.life <= 0){
      board.scanHits.splice(i, 1);
    }
  }

  board.scanRow = (board.scanRow + 1) % board.boardHeight;
  board.scanFrame++;
}
