import { rgbToGrb } from './colorUtils.js';

export default function snake(board, pixels){
  const snakeLength = Number.isFinite(board.snakeLength) ? board.snakeLength : 10;

  if(!board.snakeBody){
    board.snakeBody = [{
      x: Math.floor(Math.random()*board.boardWidth),
      y: Math.floor(Math.random()*board.boardHeight)
    }];

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    let d = dirs[Math.floor(Math.random()*dirs.length)];

    board.snakeDirX = d[0];
    board.snakeDirY = d[1];

    board.snakeSteps = 0;
    board.snakeHue = Math.random()*360;
  }

  let head = board.snakeBody[0];

  // allow only 90° turns
  if(Math.random() < 0.2){

    const turns = [];

    if(board.snakeDirX !== 0){
      turns.push([0,1]);
      turns.push([0,-1]);
    } else {
      turns.push([1,0]);
      turns.push([-1,0]);
    }

    let d = turns[Math.floor(Math.random()*turns.length)];

    board.snakeDirX = d[0];
    board.snakeDirY = d[1];
  }

  let newHead = {
    x:(head.x + board.snakeDirX + board.boardWidth)%board.boardWidth,
    y:(head.y + board.snakeDirY + board.boardHeight)%board.boardHeight
  };

  board.snakeBody.unshift(newHead);

  if(board.snakeBody.length > snakeLength)
    board.snakeBody.pop();

  board.snakeHue += 3;

  for(let i=0;i<board.snakeBody.length;i++){

    let seg = board.snakeBody[i];
    let led = board.getLedIndex(seg.x,seg.y);

    let hue = (board.snakeHue - i*10) % 360;
    let brightness = 1 - (i/board.snakeBody.length);

    let [r,g,b] = hsvToRgb(hue/360,1,brightness);

    pixels[led] = rgbToGrb(r, g, b);
  }

  board.snakeSteps++;
}


function hsvToRgb(h, s, v){
  let r, g, b;

  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r=v; g=t; b=p; break;
    case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;
    case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;
    case 5: r=v; g=p; b=q; break;
  }

  return [
    Math.floor(r*255),
    Math.floor(g*255),
    Math.floor(b*255)
  ];
}
