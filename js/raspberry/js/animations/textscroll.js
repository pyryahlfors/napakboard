const FONT_5X7 = {
  ' ': [
    '00000','00000','00000','00000','00000','00000','00000'
  ],
  '-': [
    '00000','00000','00000','11111','00000','00000','00000'
  ],
  '.': [
    '00000','00000','00000','00000','00000','01100','01100'
  ],
  '_': [
    '00000','00000','00000','00000','00000','00000','11111'
  ],
  '?': [
    '11110','00001','00010','00100','00100','00000','00100'
  ],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00110','01000','10000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00001','01110'],
  'A': ['01110','10001','10001','11111','10001','10001','10001'],
  'B': ['11110','10001','10001','11110','10001','10001','11110'],
  'C': ['01110','10001','10000','10000','10000','10001','01110'],
  'D': ['11110','10001','10001','10001','10001','10001','11110'],
  'E': ['11111','10000','10000','11110','10000','10000','11111'],
  'F': ['11111','10000','10000','11110','10000','10000','10000'],
  'G': ['01110','10001','10000','10111','10001','10001','01110'],
  'H': ['10001','10001','10001','11111','10001','10001','10001'],
  'I': ['01110','00100','00100','00100','00100','00100','01110'],
  'J': ['00001','00001','00001','00001','10001','10001','01110'],
  'K': ['10001','10010','10100','11000','10100','10010','10001'],
  'L': ['10000','10000','10000','10000','10000','10000','11111'],
  'M': ['10001','11011','10101','10101','10001','10001','10001'],
  'N': ['10001','10001','11001','10101','10011','10001','10001'],
  'O': ['01110','10001','10001','10001','10001','10001','01110'],
  'P': ['11110','10001','10001','11110','10000','10000','10000'],
  'Q': ['01110','10001','10001','10001','10101','10010','01101'],
  'R': ['11110','10001','10001','11110','10100','10010','10001'],
  'S': ['01111','10000','10000','01110','00001','00001','11110'],
  'T': ['11111','00100','00100','00100','00100','00100','00100'],
  'U': ['10001','10001','10001','10001','10001','10001','01110'],
  'V': ['10001','10001','10001','10001','10001','01010','00100'],
  'W': ['10001','10001','10001','10101','10101','10101','01010'],
  'X': ['10001','10001','01010','00100','01010','10001','10001'],
  'Y': ['10001','10001','01010','00100','00100','00100','00100'],
  'Z': ['11111','00001','00010','00100','01000','10000','11111']
};

export default function textscroll(board, pixels){
  if(!board.textScrollState){
    const sourceText = (board.scrollText && board.scrollText.trim())
      ? board.scrollText
      : (board.boardId || 'BOARD');

    const message = sourceText.toUpperCase();

    board.textScrollState = {
      message,
      columns: buildColumns(message),
      offset: board.boardWidth,
      speed: 0.35,
      frame: 0,
      hueOffset: Math.random() * 360,
      scale: 2
    };
  }

  const state = board.textScrollState;
  state.frame++;
  state.offset -= state.speed;

  const textWidth = state.columns.length;
  if(state.offset < -textWidth - 1){
    state.offset = board.boardWidth;
    state.hueOffset = (state.hueOffset + 47) % 360;
  }

  const fontHeight = 7 * state.scale;
  const yOffset = Math.max(0, Math.floor((board.boardHeight - fontHeight) / 2));

  for(let colIndex = 0; colIndex < state.columns.length; colIndex++){
    const drawX = Math.floor(colIndex + state.offset);
    if(drawX < -state.scale || drawX >= board.boardWidth) continue;

    const colBits = state.columns[colIndex];
    const hue = (state.hueOffset + colIndex * 6 + state.frame * 2) % 360;
    const [r, g, b] = hsvToRgb(hue / 360, 0.95, 0.9);

    for(let row = 0; row < 7; row++){
      if(!colBits[row]) continue;

      for(let sx = 0; sx < state.scale; sx++){
        for(let sy = 0; sy < state.scale; sy++){
          const px = drawX + sx;
          const py = yOffset + row * state.scale + sy;
          if(px < 0 || px >= board.boardWidth || py < 0 || py >= board.boardHeight) continue;

          const led = board.getLedIndex(px, py);
          pixels[led] = (r << 16) | (g << 8) | b;
        }
      }
    }
  }
}

function buildColumns(message){
  const columns = [];
  const spacingColumns = 2;

  for(const char of message){
    const glyph = FONT_5X7[char] || FONT_5X7['?'];

    for(let x = 0; x < 5; x++){
      const col = [];
      for(let y = 0; y < 7; y++){
        col.push(glyph[y][x] === '1');
      }
      columns.push(col);
    }

    for(let s = 0; s < spacingColumns; s++){
      columns.push([false, false, false, false, false, false, false]);
    }
  }

  return columns;
}

function hsvToRgb(h, s, v){
  let r, g, b;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }

  return [
    Math.floor(r * 255),
    Math.floor(g * 255),
    Math.floor(b * 255)
  ];
}
