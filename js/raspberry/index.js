import systemBoard from './js/systemboard.js';
import fireStore from './js/firestore.js';

// init board
const mySystemBoard = new systemBoard();
mySystemBoard.initialize();

// init firebase
const db = new fireStore().initialize();
const trainingSessionDoc = db.collection('trainingSessions').doc(mySystemBoard.boardId);

let current = null;
let currentRouteMeta = {
  routeId: null,
  routeName: null
};
let trainingRun = null;
let pendingTrainingSessionId = null;

const routeDoc = db.collection('current').doc(`currentRoute_${mySystemBoard.boardId}`);
const boardStatusDoc = db.collection('boardStatus').doc(`boardStatus_${mySystemBoard.boardId}`);

async function syncBoardStatus(extra = {}) {
  try {
    await boardStatusDoc.set({
      boardId: mySystemBoard.boardId,
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

function getTrainingStartHolds(routeData) {
  const holdSetup = routeData.holdSetup || {};
  const startHolds = new Set(Object.keys(holdSetup).filter((holdId) => {
    const hold = holdSetup[holdId];
    return (typeof hold === 'string' ? hold : hold && hold.type) === 'start';
  }));
  (Array.isArray(routeData.lightingOrder) ? routeData.lightingOrder : []).forEach((entry) => {
    const holdIds = Array.isArray(entry) ? entry : Array.isArray(entry && entry.holds) ? entry.holds : [entry];
    if(!holdIds.some((holdId) => {
      const hold = holdSetup[holdId];
      return (typeof hold === 'string' ? hold : hold && hold.type) === 'start';
    })) return;
    holdIds.forEach((holdId) => {
      const hold = holdSetup[holdId];
      const type = typeof hold === 'string' ? hold : hold && hold.type;
      if(typeof holdId === 'string' && hold && type !== 'top') startHolds.add(holdId);
    });
  });
  return [...startHolds];
}

function getTrainingGroups(routeData) {
  const holdSetup = routeData.holdSetup || {};
  const holdType = (holdId) => {
    const hold = holdSetup[holdId];
    return typeof hold === 'string' ? hold : hold && hold.type;
  };
  const startHolds = getTrainingStartHolds(routeData);
  const endHolds = Object.keys(holdSetup).filter((holdId) => holdType(holdId) === 'top');
  const fixedHolds = new Set([...startHolds, ...endHolds]);
  const seenHolds = new Set(fixedHolds);
  const middleGroups = [];

  (Array.isArray(routeData.lightingOrder) ? routeData.lightingOrder : []).forEach((entry) => {
    const holdIds = Array.isArray(entry) ? entry : Array.isArray(entry && entry.holds) ? entry.holds : [entry];
    const group = holdIds.filter((holdId) => {
      if(typeof holdId !== 'string' || !holdSetup[holdId] || seenHolds.has(holdId)) return false;
      seenHolds.add(holdId);
      return true;
    });
    if(holdIds.some((holdId) => holdType(holdId) === 'top')) endHolds.push(...group);
    else if(group.length) middleGroups.push(group);
  });

  Object.keys(holdSetup).forEach((holdId) => {
    if(!seenHolds.has(holdId)) {
      seenHolds.add(holdId);
      middleGroups.push([holdId]);
    }
  });

  return [
    ...middleGroups,
    ...(endHolds.length ? [endHolds] : [])
  ];
}

function scheduleTrainingAction(run, delayMs, action) {
  if(trainingRun !== run) return;
  if(run.timer) clearTimeout(run.timer);
  run.nextAction = action;
  run.remainingMs = Math.max(0, delayMs);
  run.deadline = Date.now() + run.remainingMs;
  if(run.phase === 'resting' || run.phase === 'countdown') {
    const routeData = run.routes[run.routeIndex + (run.phase === 'resting' ? 1 : 0)];
    const holdSetup = routeData.holdSetup || {};
    const startHolds = getTrainingStartHolds(routeData);
    if(run.phase === 'countdown') mySystemBoard.clearLights('training-countdown');
    mySystemBoard.litTrainingRest(run.phase === 'resting' ? run.restMs : 5000, run.deadline, holdSetup, startHolds);
    if(run.phase === 'countdown') {
      void syncBoardStatus({
        trainingMode: true,
        trainingSessionId: run.sessionId,
        trainingStatus: 'countdown',
        trainingCountdownDeadline: run.deadline
      });
    }
  }
  run.timer = setTimeout(() => {
    if(trainingRun !== run || run.paused) return;
    run.timer = null;
    run.remainingMs = 0;
    action();
  }, run.remainingMs);
}

function finishTrainingRun(run, reason) {
  if(!run || trainingRun !== run) return;
  if(run.timer) clearTimeout(run.timer);
  trainingRun = null;
  currentRouteMeta = {routeId: null, routeName: null};
  mySystemBoard.trainingActive = false;
  mySystemBoard.clearLights(reason);

  void syncBoardStatus({
    trainingMode: false,
    trainingSessionId: run.sessionId,
    trainingStatus: reason
  });
}

function lightNextTrainingGroup(run) {
  if(trainingRun !== run) return;

  const routeData = run.routes[run.routeIndex];
  const group = routeData && routeData.lightingGroups[run.stepIndex];
  if(!routeData || !group) {
    finishTrainingRun(run, 'training-complete');
    return;
  }

  run.phase = 'lighting';
  run.currentHoldIds = group;
  if(run.stepIndex === 0) {
    const startHolds = getTrainingStartHolds(routeData);
    run.recentHoldGroups = startHolds.length ? [startHolds] : [];
  }
  run.recentHoldGroups = [...run.recentHoldGroups, group].slice(-4);
  currentRouteMeta = {
    routeId: routeData.routeId || null,
    routeName: routeData.routeName || routeData.name || `Training route ${run.routeIndex + 1}`
  };
  const zoomDurationMs = mySystemBoard.litTrainingGroup(routeData.holdSetup || {}, group, run.recentHoldGroups.flat());
  void syncBoardStatus({
    trainingMode: true,
    trainingSessionId: run.sessionId,
    trainingStatus: 'running',
    trainingRouteIndex: run.routeIndex,
    trainingStepIndex: run.stepIndex
  });

  const hasTopHold = group.some((holdId) => {
    const hold = (routeData.holdSetup || {})[holdId];
    return (typeof hold === 'string' ? hold : hold && hold.type) === 'top';
  });
  scheduleTrainingAction(run, Math.max(run.holdIntervalMs, zoomDurationMs + (hasTopHold ? 3000 : 0)), () => {
    if(run.stepIndex + 1 < routeData.lightingGroups.length) {
      run.stepIndex += 1;
      lightNextTrainingGroup(run);
      return;
    }

    mySystemBoard.clearLights('training-between-routes');
    if(run.routeIndex + 1 >= run.routes.length) {
      finishTrainingRun(run, 'training-complete');
      return;
    }

    const beginNextRoute = () => {
      run.routeIndex += 1;
      run.stepIndex = 0;
      run.recentHoldGroups = [];
      lightNextTrainingGroup(run);
    };

    if(run.restMs > 0) {
      run.phase = 'resting';
      void syncBoardStatus({
        trainingMode: true,
        trainingSessionId: run.sessionId,
        trainingStatus: 'resting',
        trainingRouteIndex: run.routeIndex + 1,
        trainingStepIndex: 0
      });
      scheduleTrainingAction(run, run.restMs, beginNextRoute);
    } else {
      beginNextRoute();
    }
  });
}

async function startTrainingRun(session) {
  const sessionId = session.sessionId || `${mySystemBoard.boardId}-${Date.now()}`;
  if((trainingRun && trainingRun.sessionId === sessionId) || pendingTrainingSessionId === sessionId) return;
  pendingTrainingSessionId = sessionId;

  try {
    const routeEntries = Array.isArray(session.routes) ? session.routes : [];
    const routes = await Promise.all(routeEntries.map(async (routeData) => {
      const routeId = routeData.routeId || routeData.id;
      let sourceRoute = {};

      if((!routeData.holdSetup || !Object.keys(routeData.holdSetup).length) && routeId) {
        const routeSnapshot = await db.collection('routes').doc(routeId).get();
        if(routeSnapshot.exists) sourceRoute = routeSnapshot.data();
      }

      const normalizedRoute = {
        ...sourceRoute,
        ...routeData,
        routeId,
        routeName: routeData.routeName || sourceRoute.name,
        holdSetup: routeData.holdSetup && Object.keys(routeData.holdSetup).length
          ? routeData.holdSetup
          : sourceRoute.holdSetup || {},
        lightingOrder: Array.isArray(routeData.lightingOrder) && routeData.lightingOrder.length
          ? routeData.lightingOrder
          : sourceRoute.lightingOrder || []
      };

      return {...normalizedRoute, lightingGroups: getTrainingGroups(normalizedRoute)};
    }));

    if(pendingTrainingSessionId !== sessionId) return;
    const playableRoutes = routes.filter((routeData) => Object.keys(routeData.holdSetup || {}).length && routeData.lightingGroups.length);
    if(!playableRoutes.length) {
      console.error(`Training session ${sessionId} has no playable routes for board ${mySystemBoard.boardId}.`);
      void syncBoardStatus({trainingMode: false, trainingSessionId: sessionId, trainingStatus: 'invalid-training-session'});
      return;
    }

    if(trainingRun) finishTrainingRun(trainingRun, 'training-replaced');
    const toSeconds = (value, fallback, min = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
    };

    trainingRun = {
      sessionId,
      routes: playableRoutes,
      routeIndex: 0,
      stepIndex: 0,
      recentHoldGroups: [],
      holdIntervalMs: toSeconds(session.holdIntervalSeconds, 1, 0.1) * 1000,
      restMs: toSeconds(session.restSeconds, 60) * 1000,
      timer: null,
      deadline: 0,
      remainingMs: 0,
      nextAction: null,
      currentHoldIds: [],
      phase: 'lighting',
      paused: false
    };
    current = null;
    currentRouteMeta = {routeId: null, routeName: null};
    mySystemBoard.trainingActive = true;
    console.log(`Training started on ${mySystemBoard.boardId}: ${playableRoutes.length} routes`);
    if(session.status === 'countdown') {
      const run = trainingRun;
      run.phase = 'countdown';
      scheduleTrainingAction(run, 5000, () => lightNextTrainingGroup(run));
    } else {
      lightNextTrainingGroup(trainingRun);
    }
  } catch (error) {
    console.error(`Failed to prepare training session ${sessionId}:`, error);
    void syncBoardStatus({trainingMode: false, trainingSessionId: sessionId, trainingStatus: 'training-route-load-failed'});
  } finally {
    if(pendingTrainingSessionId === sessionId) pendingTrainingSessionId = null;
  }
}

function handleTrainingSession(session) {
  if(!session || session.mode !== 'training') return;
  const sameSession = trainingRun && trainingRun.sessionId === session.sessionId;

  if(session.status === 'countdown' || session.status === 'running' || session.status === 'resting') {
    if(sameSession) {
      if(trainingRun.paused) {
        trainingRun.paused = false;
        scheduleTrainingAction(trainingRun, trainingRun.remainingMs, trainingRun.nextAction);
      }
      return;
    }
    startTrainingRun(session);
    return;
  }

  if(session.status === 'paused') {
    if(!sameSession || trainingRun.paused) return;
    if(trainingRun.timer) clearTimeout(trainingRun.timer);
    trainingRun.timer = null;
    trainingRun.remainingMs = Math.max(0, trainingRun.deadline - Date.now());
    trainingRun.paused = true;
    if(trainingRun.phase === 'resting' || trainingRun.phase === 'countdown') {
      mySystemBoard.pauseTrainingRest(trainingRun.remainingMs);
    }
    void syncBoardStatus({
      trainingMode: true,
      trainingSessionId: trainingRun.sessionId,
      trainingStatus: 'paused',
      trainingRouteIndex: trainingRun.routeIndex,
      trainingStepIndex: trainingRun.stepIndex
    });
    return;
  }

  if(session.status === 'stopped' || session.status === 'complete') {
    if(pendingTrainingSessionId === session.sessionId) pendingTrainingSessionId = null;
    if(sameSession) finishTrainingRun(trainingRun, `training-${session.status}`);
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
  async (snapshot) => {
    if(!snapshot.exists) return;
    const { routeId, routeName, routeData } = snapshot.data();
    if(!routeData) return;
    const isSameRoute = JSON.stringify(routeData) === JSON.stringify(current);
    if(isSameRoute && !trainingRun) return;

    current = routeData;
    const interruptedTraining = trainingRun;
    if(interruptedTraining) {
      finishTrainingRun(interruptedTraining, 'normal-route-selected');
      void trainingSessionDoc.set({
        mode: 'training',
        sessionId: interruptedTraining.sessionId,
        status: 'stopped',
        updatedBy: 'raspberry',
        stopReason: 'A normal route was selected.',
        updatedAt: new Date()
      }, {merge: true}).catch((error) => {
        console.error('Failed to mark training stopped:', error);
      });
    }
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
  },
  (error) => {
    console.error(error);
  }
);

trainingSessionDoc.onSnapshot(
  (snapshot) => {
    if(!snapshot.exists) return;
    handleTrainingSession(snapshot.data());
  },
  (error) => {
    console.error('Failed to listen for training sessions:', error);
  }
);
