import systemBoard from './js/systemboard.js';
import fireStore from './js/firestore.js';

// init board
const mySystemBoard = new systemBoard();
mySystemBoard.initialize();

// init firebase
const db = new fireStore().initialize();

let current = null;
let currentRouteMeta = {
  routeId: null,
  routeName: null
};

const routeDoc = db.collection('current').doc(`currentRoute_${mySystemBoard.boardId}`);
const boardStatusDoc = db.collection('boardStatus').doc(`boardStatus_${mySystemBoard.boardId}`);

async function syncBoardStatus(extra = {}) {
  try {
    await boardStatusDoc.set({
      boardId: mySystemBoard.boardId,
      status: 'online',
      lastSeenAt: Date.now(),
      routeId: currentRouteMeta.routeId,
      routeName: currentRouteMeta.routeName,
      screensaverOn: mySystemBoard.screensaverRunning,
      screensaverMode: mySystemBoard.screensaverMode,
      ...extra
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync board status:', error);
  }
}

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
  const colLabels = cols.slice(0, width);

  for (let y = 0; y < height; y++) {
    lines.push(`${String(y + 1).padStart(2, ' ')}|${grid[y].join('')}`);
  }
  lines.push(`   ${'-'.repeat(width)}`);
  lines.push(`   ${colLabels}`);

  return lines.join('\n');
}

mySystemBoard.setStatusChangeHandler((status) => {
  syncBoardStatus({
    screensaverOn: status.screensaverOn,
    screensaverMode: status.screensaverMode,
    statusReason: status.reason
  });
});

syncBoardStatus({ statusReason: 'board-online' });

routeDoc.onSnapshot(
  async (doc) => {
    if(!doc.exists) return;
    const { routeId, routeName, routeData } = doc.data();
    if(!routeData) return;

    if(JSON.stringify(routeData) === JSON.stringify(current)) return;
    currentRouteMeta = { routeId, routeName };
    await syncBoardStatus({
      routeId,
      routeName,
      statusReason: 'route-updated'
    });
    console.clear();
    console.log(`Name: ${routeName} - ID: ${routeId}`);
    console.log(renderRouteAscii(routeData, mySystemBoard));
    mySystemBoard.lit(routeData);
    current = routeData;
  },
  (error) => {
    console.error(error);
  }
);
