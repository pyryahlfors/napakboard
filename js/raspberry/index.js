import systemBoard from './js/systemboard.js';
import fireStore from './js/firestore.js';

// init board
const mySystemBoard = new systemBoard();
mySystemBoard.initialize();

// init firebase
const db = new fireStore().initialize();

let current = null;

const routeDoc = db.collection('current').doc(`currentRoute_${mySystemBoard.boardId}`);

function renderRouteAscii(route, board) {
  const width = board.boardWidth;
  const height = board.boardHeight;
  const cols = board.boardCols;
  const grid = Array.from({ length: height }, () => Array(width).fill(' '));
  const holdSetup = route?.holdSetup || {};

  const holdToChar = {
    start: 'X',
    top: 'X',
    intermediate: '*',
    foot: '•'
  };

  for (const node in holdSetup) {
    const match = node.match(/[a-zA-Z]+|[0-9]+/g);
    if (!match) continue;

    const x = cols.indexOf(match[0].toLowerCase());
    const y = Number(match[1]) - 1;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    grid[y][x] = holdToChar[holdSetup[node]] || ' ';
  }

  const lines = [];
  lines.push('ASCII board:');
  for (let y = height - 1; y >= 0; y--) {
    lines.push(`${String(y + 1).padStart(2, ' ')}|${grid[y].join('')}`);
  }
  lines.push(`   ${'-'.repeat(width)}`);
  lines.push(`   ${cols.slice(0, width)}`);

  return lines.join('\n');
}

routeDoc.onSnapshot(
  (doc) => {
    if(!doc.exists) return;
    const { routeId, routeName, routeData } = doc.data();
    if(!routeData) return;

    if(JSON.stringify(routeData) === JSON.stringify(current)) return;
    console.log(`Name: ${routeName} - ID: ${routeId}`);
    console.log(renderRouteAscii(routeData, mySystemBoard));
    mySystemBoard.lit(routeData);
    current = routeData;
  },
  (error) => {
    console.error(error);
  }
);
