import { rgbToGrb, colorToGrb } from './colorUtils.js';

const RADAR = {
  beamColor: { r: 215, g: 235, b: 225 },
  beamIntensity: 0.42,
  trailRows: 1,
  trailDecay: 0.3,
  hitSpawnChance: 0.03
};

export default function scanner(board, pixels){

  if(board.scanRow === undefined){
    board.scanRow = 0;
    board.scanFrame = 0;
    board.scanHits = []; // Track lit-up objects that are fading
    board.scanHitPalette = buildHoldHitPalette(board);
  }

  const scanCycleFrames = Math.max(1, board.boardHeight);
  const hitMaxLife = Math.max(6, scanCycleFrames - 4);

  // Draw main scanner line (single row)
  for(let x = 0; x < board.boardWidth; x++){
    const led = board.getLedIndex(x, board.scanRow);
    pixels[led] = colorWithIntensity(RADAR.beamColor, RADAR.beamIntensity);
  }

  // Draw short soft trail behind the beam (movie radar look)
  for(let trail = 1; trail <= RADAR.trailRows; trail++){
    const trailRow = (board.scanRow - trail + board.boardHeight) % board.boardHeight;
    for(let x = 0; x < board.boardWidth; x++){
      const led = board.getLedIndex(x, trailRow);
      const intensity = RADAR.beamIntensity * Math.pow(RADAR.trailDecay, trail);
      pixels[led] = colorWithIntensity(RADAR.beamColor, intensity);
    }
  }

  // Randomly spawn new hits as scanner passes
  for(let x = 0; x < board.boardWidth; x++){
    if(Math.random() < RADAR.hitSpawnChance){
      const palette = board.scanHitPalette && board.scanHitPalette.length
        ? board.scanHitPalette
        : buildHoldHitPalette(board);
      const hitColor = palette[Math.floor(Math.random() * palette.length)];

      board.scanHits.push({
        x: x,
        y: board.scanRow,
        life: hitMaxLife,
        maxLife: hitMaxLife,
        color: hitColor
      });
    }
  }

  // Update and render all hits
  for(let i = board.scanHits.length - 1; i >= 0; i--){
    const hit = board.scanHits[i];
    const lifeRatio = hit.life / hit.maxLife;
    const led = board.getLedIndex(hit.x, hit.y);

    // Hold-colored hit marker fading out
    pixels[led] = colorWithIntensity(hit.color, lifeRatio);

    hit.life--;
    if(hit.life <= 0){
      board.scanHits.splice(i, 1);
    }
  }

  board.scanRow = (board.scanRow + 1) % board.boardHeight;
  board.scanFrame++;
}

function colorWithIntensity(color, intensity){
  return colorToGrb(color, intensity);
}

function buildHoldHitPalette(board){
  const fallback = [
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 90, b: 255 },
    { r: 255, g: 220, b: 0 },
    { r: 255, g: 60, b: 60 }
  ];

  const holdColors = board.holdColors || {};
  const keysByPriority = [
    ['start'],
    ['intermediate'],
    ['foot', 'foothold'],
    ['top', 'end']
  ];

  const palette = [];

  for(let i = 0; i < keysByPriority.length; i++){
    const keyGroup = keysByPriority[i];
    let parsed = null;

    for(let k = 0; k < keyGroup.length; k++){
      const key = keyGroup[k];
      if(holdColors[key] === undefined) continue;

      parsed = parseHexColorGrbToRgb(holdColors[key]);
      if(parsed) break;
    }

    palette.push(parsed || fallback[i]);
  }

  return palette;
}

function parseHexColorGrbToRgb(raw){
  if(raw === undefined || raw === null) return null;

  let value = String(raw).trim().toLowerCase();
  if(value.startsWith('0x')) value = value.slice(2);
  if(value.startsWith('#')) value = value.slice(1);
  value = value.replace(/[^0-9a-f]/g, '');

  if(value.length === 3){
    value = value.split('').map(ch => ch + ch).join('');
  }

  if(value.length > 6) return null;

  if(value.length !== 6) return null;

  const n = Number.parseInt(value, 16);
  if(Number.isNaN(n)) return null;

  // holdColors are defined as GRB hex; convert to RGB for animation rendering.
  const g = (n >> 16) & 0xFF;
  const r = (n >> 8) & 0xFF;
  const b = n & 0xFF;

  return { r, g, b };
}
