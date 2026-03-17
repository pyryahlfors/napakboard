export default function balls(board, pixels){

  if(!board.balls){
    board.balls = [];
    const ballCount = 3;
    const ballSize = 2;

    for(let i = 0; i < ballCount; i++){
      const speedX = randomVelocity();
      const speedY = randomVelocity();

      board.balls.push({
        x: Math.random() * (board.boardWidth - ballSize),
        y: Math.random() * (board.boardHeight - ballSize),
        vx: speedX,
        vy: speedY,
        hue: Math.random() * 360,
        size: ballSize
      });
    }
    board.ballsFrame = 0;
  }

  // Update ball positions
  for(let ball of board.balls){
    ball.x += ball.vx;
    ball.y += ball.vy;

    const maxX = board.boardWidth - ball.size;
    const maxY = board.boardHeight - ball.size;

    if(ball.x <= 0){
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    } else if(ball.x >= maxX){
      ball.x = maxX;
      ball.vx = -Math.abs(ball.vx);
    }

    if(ball.y <= 0){
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    } else if(ball.y >= maxY){
      ball.y = maxY;
      ball.vy = -Math.abs(ball.vy);
    }

    // Change hue slowly
    ball.hue = (ball.hue + 2) % 360;
  }

  // Draw balls
  for(let ball of board.balls){
    const x = Math.round(ball.x);
    const y = Math.round(ball.y);

    // HSL to RGB conversion
    const h = ball.hue / 60;
    const s = 1;
    const l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x2 = c * (1 - Math.abs((h % 2) - 1));
    const m = l - c / 2;

    let r, g, b;
    if(h < 1){ r = c; g = x2; b = 0; }
    else if(h < 2){ r = x2; g = c; b = 0; }
    else if(h < 3){ r = 0; g = c; b = x2; }
    else if(h < 4){ r = 0; g = x2; b = c; }
    else if(h < 5){ r = x2; g = 0; b = c; }
    else { r = c; g = 0; b = x2; }

    r = Math.floor((r + m) * 255);
    g = Math.floor((g + m) * 255);
    b = Math.floor((b + m) * 255);

    for(let offsetX = 0; offsetX < ball.size; offsetX++){
      for(let offsetY = 0; offsetY < ball.size; offsetY++){
        const drawX = x + offsetX;
        const drawY = y + offsetY;

        if(drawX >= 0 && drawX < board.boardWidth && drawY >= 0 && drawY < board.boardHeight){
          const led = board.getLedIndex(drawX, drawY);
          pixels[led] = (r << 16) | (g << 8) | b;
        }
      }
    }
  }

  board.ballsFrame++;
}

function randomVelocity(){
  const magnitude = 0.35 + Math.random() * 0.75;
  return Math.random() < 0.5 ? -magnitude : magnitude;
}
