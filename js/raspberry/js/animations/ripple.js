export default function ripple(board, pixels){

  if(!board.ripples){
    board.ripples = [];
    board.rippleFrame = 0;
  }

  board.rippleFrame++;

  // Spawn occasional ripples at random positions.
  if(board.ripples.length < 4 && Math.random() < 0.18){
    board.ripples.push({
      x: Math.random() * (board.boardWidth - 1),
      y: Math.random() * (board.boardHeight - 1),
      radius: 0,
      speed: 0.32 + Math.random() * 0.22,
      life: 1,
      decay: 0.018 + Math.random() * 0.012,
      tint: pickTint()
    });
  }

  for(let i = board.ripples.length - 1; i >= 0; i--){
    const wave = board.ripples[i];

    // Expand and fade ripple over time.
    wave.radius += wave.speed;
    wave.life -= wave.decay;

    const thickness = 0.9;

    for(let x = 0; x < board.boardWidth; x++){
      for(let y = 0; y < board.boardHeight; y++){
        const dx = x - wave.x;
        const dy = y - wave.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const edge = Math.abs(distance - wave.radius);

        if(edge > thickness) continue;

        const ringStrength = (1 - edge / thickness) * Math.max(0, wave.life);
        if(ringStrength <= 0.02) continue;

        const led = board.getLedIndex(x, y);

        const addR = Math.floor(255 * ringStrength * wave.tint.r);
        const addG = Math.floor(255 * ringStrength * wave.tint.g);
        const addB = Math.floor(255 * ringStrength * wave.tint.b);

        const current = pixels[led];
        const currentR = (current >> 16) & 0xFF;
        const currentG = (current >> 8) & 0xFF;
        const currentB = current & 0xFF;

        const r = Math.min(255, currentR + addR);
        const g = Math.min(255, currentG + addG);
        const b = Math.min(255, currentB + addB);

        pixels[led] = (r << 16) | (g << 8) | b;
      }
    }

    const maxRadius = Math.max(board.boardWidth, board.boardHeight) + 2;
    if(wave.life <= 0 || wave.radius > maxRadius){
      board.ripples.splice(i, 1);
    }
  }
}

function pickTint(){
  const palette = [
    { r: 0.15, g: 0.9, b: 1.0 },
    { r: 0.25, g: 0.75, b: 1.0 },
    { r: 0.4, g: 0.95, b: 0.9 },
    { r: 0.55, g: 0.75, b: 1.0 }
  ];

  return palette[Math.floor(Math.random() * palette.length)];
}
