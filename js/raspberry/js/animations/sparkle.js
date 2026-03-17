export default function sparkle(board, pixels){

  if(!board.sparkle){
    board.sparkle = new Array(board.config.leds).fill(0);
    board.sparkleColors = new Array(board.config.leds).fill(null);
  }

  let activeSparkles = 0;

  for(let i=0;i<board.config.leds;i++){
    board.sparkle[i] *= 0.92;

    if(board.sparkle[i] <= 0.05){
      board.sparkleColors[i] = null;
    }

    if(Math.random() < 0.003){
      board.sparkle[i] = 1;
      board.sparkleColors[i] = createSparkleTint();
    }

    if(board.sparkle[i] > 0.05){
      activeSparkles++;
      let v = Math.floor(255*board.sparkle[i]);
      let tint = board.sparkleColors[i] || { r: 1, g: 1, b: 1 };
      let r = Math.min(255, Math.floor(v * tint.r));
      let g = Math.min(255, Math.floor(v * tint.g));
      let b = Math.min(255, Math.floor(v * tint.b));
      pixels[i] = (r<<16)|(g<<8)|b;
    }
  }

  if(activeSparkles < 6){
    seedSparkles(board);
  }
}

function createSparkleTint(){
  const palette = [
    { r: 1.0, g: 0.55, b: 0.72 },
    { r: 1.0, g: 0.72, b: 0.45 },
    { r: 0.55, g: 0.82, b: 1.0 },
    { r: 0.5, g: 1.0, b: 0.72 },
    { r: 0.82, g: 0.58, b: 1.0 },
    { r: 1.0, g: 0.9, b: 0.5 }
  ];

  const base = palette[Math.floor(Math.random() * palette.length)];
  const variation = 0.04;

  return {
    r: Math.min(1, Math.max(0.45, base.r + (Math.random() * variation * 2 - variation))),
    g: Math.min(1, Math.max(0.45, base.g + (Math.random() * variation * 2 - variation))),
    b: Math.min(1, Math.max(0.45, base.b + (Math.random() * variation * 2 - variation)))
  };
}

function seedSparkles(board){
  const seeds = 2 + Math.floor(Math.random() * 3);

  for(let i = 0; i < seeds; i++){
    const index = Math.floor(Math.random() * board.config.leds);
    board.sparkle[index] = 1;
    board.sparkleColors[index] = createSparkleTint();
  }
}
