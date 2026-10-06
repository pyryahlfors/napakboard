import { collection, doc, getFirestore, onSnapshot, query, serverTimestamp, setDoc, where } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';
import { dce } from '../shared/helpers.js';
import { globals } from '../shared/globals.js';
import { route } from '../shared/route.js';
import bottomNavi from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js?training';

const isTrainingRoute = (routeData) => {
  if (routeData.archived) return false;
  const tags = Array.isArray(routeData.tags) ? routeData.tags : [routeData.tags];
  return routeData.training === true || tags.some((tag) => typeof tag === 'string' && tag.toLowerCase() === 'training');
};

const getLightingGroups = (routeData) => (Array.isArray(routeData.lightingOrder) ? routeData.lightingOrder : [])
  .map((entry) => {
    const holds = Array.isArray(entry) ? entry : Array.isArray(entry && entry.holds) ? entry.holds : [entry];
    return holds.filter((holdId) => typeof holdId === 'string');
  })
  .filter((group) => group.length > 0);

class viewTraining {
  constructor() {
    const page = dce({el: 'MAIN', cssClass: 'page-training'});
    const ticker = new statusTicker({interactive: false, title: 'Training'});

    const content = dce({el: 'DIV', cssClass: 'training-content'});
    const sessionSection = dce({el: 'SECTION', cssClass: 'training-session'});
    const settingsHeading = dce({el: 'H2', content: 'Session settings'});
    const sessionHeading = dce({el: 'H2', content: 'Routes'});
    const routeStatus = dce({el: 'P', cssClass: 'training-status', content: 'Loading routes…'});
    routeStatus.setAttribute('role', 'status');
    routeStatus.setAttribute('aria-live', 'polite');
    const routeList = dce({el: 'UL', cssClass: 'training-route-list'});

    const selectedHeading = dce({el: 'H3', content: 'Session order'});
    const selectedRoutes = dce({el: 'OL', cssClass: 'training-selected-routes'});
    const settings = dce({el: 'DIV', cssClass: 'training-session-settings'});
    const restLabel = dce({el: 'LABEL', content: 'Rest between routes (seconds)'});
    const restInput = dce({el: 'INPUT'});
    restInput.type = 'number';
    restInput.name = 'training-rest';
    restInput.min = '0';
    restInput.max = '3600';
    restInput.step = '5';
    restInput.value = '60';
    restLabel.appendChild(restInput);
    const holdIntervalLabel = dce({el: 'LABEL', content: 'Delay between holds (seconds)'});
    const holdIntervalInput = dce({el: 'INPUT'});
    holdIntervalInput.type = 'number';
    holdIntervalInput.name = 'training-hold-interval';
    holdIntervalInput.min = '1';
    holdIntervalInput.max = '60';
    holdIntervalInput.step = '1';
    holdIntervalInput.value = '1';
    holdIntervalLabel.appendChild(holdIntervalInput);
    settings.appendChild(restLabel);
    settings.appendChild(holdIntervalLabel);

    const countdownShadow = dce({el: 'DIV', cssClass: 'modal-shadow training-countdown-shadow'});
    countdownShadow.hidden = true;
    const countdownDisplay = dce({el: 'DIV', cssClass: 'training-countdown'});
    countdownDisplay.setAttribute('role', 'dialog');
    countdownDisplay.setAttribute('aria-modal', 'true');
    countdownDisplay.setAttribute('aria-labelledby', 'training-countdown-heading');
    const countdownNumber = dce({el: 'P', cssClass: 'training-countdown-number', content: '5'});
    const countdownLabel = dce({el: 'P', id: 'training-countdown-heading', cssClass: 'training-countdown-label', content: 'Put your phone away'});
    const cancelCountdownButton = dce({el: 'BUTTON', cssClass: 'btn btn_small training-countdown-cancel', content: 'Cancel'});
    cancelCountdownButton.type = 'button';
    countdownDisplay.append(countdownNumber, countdownLabel, cancelCountdownButton);
    countdownShadow.appendChild(countdownDisplay);
    countdownDisplay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        stopSession();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        cancelCountdownButton.focus();
      }
    });

    const sessionStatus = dce({el: 'P', cssClass: 'training-session-status', content: 'Select routes to prepare a session.'});
    sessionStatus.setAttribute('role', 'status');
    sessionStatus.setAttribute('aria-live', 'off');
    const controls = dce({el: 'DIV', cssClass: 'training-session-controls'});
    const playButton = dce({el: 'BUTTON', cssClass: 'btn training-play', content: 'Play'});
    const pauseButton = dce({el: 'BUTTON', cssClass: 'btn btn_white training-pause', content: 'Pause'});
    const stopButton = dce({el: 'BUTTON', cssClass: 'btn destructive training-stop', content: 'Stop'});
    [playButton, pauseButton, stopButton].forEach((button) => { button.type = 'button'; });
    pauseButton.disabled = true;
    stopButton.disabled = true;
    controls.append(playButton, pauseButton, stopButton);

    sessionSection.append(settingsHeading, settings, sessionHeading, routeStatus, routeList, selectedHeading, selectedRoutes, controls, sessionStatus);
    content.appendChild(sessionSection);

    const footerNavi = new bottomNavi({options: {
      createTrainingRoute: {
        title: 'Create route',
        icon: 'light',
        link: () => route('trainingRoute')
      },
      list: {
        title: 'Climb',
        icon: 'climb',
        link: () => route('board')
      }
    }});
    page.append(ticker.render(), content, footerNavi.render(), countdownShadow);

    const db = getFirestore();
    let boardRoutes = [];
    let selectedRouteIds = [];
    let sessionState = 'stopped';
    let saving = false;
    let sessionTimer = null;
    let phaseDeadline = 0;
    let phaseDurationMs = 0;
    let pausedRemainingMs = 0;
    let pausedPhase = null;
    let routeStartedAt = 0;
    let routeDurationMs = 0;
    let activeRouteIndex = -1;
    let currentStepIndex = -1;
    let lastCountdownValue = null;
    let routeProgressElements = new Map();
    const routeProgress = new Map();

    const routeById = (id) => boardRoutes.find((routeData) => routeData.id === id);
    const selectedTrainingRoutes = () => selectedRouteIds.map(routeById).filter(Boolean);
    const getRouteGroups = (routeData) => getLightingGroups(routeData);

    const updateProgressRows = () => {
      selectedTrainingRoutes().forEach((routeData, index) => {
        const elements = routeProgressElements.get(routeData.id);
        if (!elements) return;

        const groups = getRouteGroups(routeData);
        const holdCount = groups.reduce((count, group) => count + group.length, 0);
        elements.item.classList.toggle('is-active', sessionState === 'running' && index === activeRouteIndex);
        elements.fill.style.width = `${routeProgress.get(routeData.id) || 0}%`;
        elements.routeInfo.textContent = sessionState === 'running' && index === activeRouteIndex
          ? `Step ${currentStepIndex + 1} of ${groups.length}`
          : `${groups.length} steps`;
      });
    };

    const resetRouteProgress = () => {
      routeProgress.clear();
      selectedRouteIds.forEach((id) => routeProgress.set(id, 0));
      updateProgressRows();
    };

    const updateControls = () => {
      const active = ['countdown', 'running', 'resting', 'paused'].includes(sessionState);
      const locked = saving || active;
      settings.classList.toggle('is-session-active', active);
      const routesReady = selectedTrainingRoutes().length > 0 && selectedTrainingRoutes().every((routeData) => getRouteGroups(routeData).length > 0);
      playButton.disabled = saving || ['countdown', 'running', 'resting', 'paused'].includes(sessionState) || !routesReady;
      playButton.textContent = sessionState === 'countdown' ? 'Starting…' : 'Play';
      pauseButton.disabled = saving || !['countdown', 'running', 'resting', 'paused'].includes(sessionState);
      pauseButton.textContent = sessionState === 'paused' ? 'Resume' : 'Pause';
      stopButton.disabled = saving || sessionState === 'stopped';
      restInput.disabled = locked;
      holdIntervalInput.disabled = locked;
      routeList.querySelectorAll('button').forEach((button) => { button.disabled = locked; });
      selectedRoutes.querySelectorAll('button').forEach((button) => { button.disabled = locked; });
    };

    const renderSelectedRoutes = () => {
      selectedRoutes.replaceChildren();
      routeProgressElements = new Map();
      selectedRouteIds = selectedRouteIds.filter((id) => boardRoutes.some((routeData) => routeData.id === id && isTrainingRoute(routeData)));

      selectedTrainingRoutes().forEach((routeData, index) => {
        const item = dce({el: 'LI', cssClass: 'training-selected-route'});
        const routeName = dce({el: 'SPAN', content: routeData.name || 'Unnamed route'});
        const lightingGroups = getLightingGroups(routeData);
        const holdCount = lightingGroups.reduce((count, group) => count + group.length, 0);
        const routeInfo = dce({el: 'SPAN', cssClass: 'training-route-info', content: `${lightingGroups.length} steps · ${holdCount} holds`});
        const progressTrack = dce({el: 'SPAN', cssClass: 'training-route-progress'});
        const progressFill = dce({el: 'SPAN', cssClass: 'training-route-progress-fill'});
        progressTrack.setAttribute('aria-hidden', 'true');
        progressTrack.appendChild(progressFill);
        routeProgressElements.set(routeData.id, {item, fill: progressFill, routeInfo, lightingGroups});
        if (!routeProgress.has(routeData.id)) routeProgress.set(routeData.id, 0);
        const controls = dce({el: 'DIV', cssClass: 'training-order-controls'});

        const moveUp = dce({el: 'BUTTON', cssClass: 'btn btn_tiny', content: '↑'});
        moveUp.type = 'button';
        moveUp.setAttribute('aria-label', `Move ${routeData.name} up`);
        moveUp.disabled = index === 0;
        moveUp.addEventListener('click', () => {
          [selectedRouteIds[index - 1], selectedRouteIds[index]] = [selectedRouteIds[index], selectedRouteIds[index - 1]];
          renderSelectedRoutes();
          renderRouteList();
        });

        const moveDown = dce({el: 'BUTTON', cssClass: 'btn btn_tiny', content: '↓'});
        moveDown.type = 'button';
        moveDown.setAttribute('aria-label', `Move ${routeData.name} down`);
        moveDown.disabled = index === selectedRouteIds.length - 1;
        moveDown.addEventListener('click', () => {
          [selectedRouteIds[index + 1], selectedRouteIds[index]] = [selectedRouteIds[index], selectedRouteIds[index + 1]];
          renderSelectedRoutes();
          renderRouteList();
        });

        const remove = dce({el: 'BUTTON', cssClass: 'btn btn_tiny destructive', content: 'Remove'});
        remove.type = 'button';
        remove.addEventListener('click', () => {
          selectedRouteIds = selectedRouteIds.filter((id) => id !== routeData.id);
          renderSelectedRoutes();
          renderRouteList();
        });

        controls.append(moveUp, moveDown, remove);
        item.append(progressTrack, routeName, routeInfo, controls);
        selectedRoutes.appendChild(item);
      });

      updateProgressRows();

      if (sessionState === 'stopped') {
        sessionStatus.textContent = selectedRouteIds.length
          ? `${selectedRouteIds.length} route${selectedRouteIds.length === 1 ? '' : 's'} selected · ${restInput.value}s rest · ${holdIntervalInput.value}s between holds.`
          : 'Select routes to prepare a session.';
      }
      updateControls();
    };

    const renderRouteList = () => {
      routeList.replaceChildren();
      const trainingRoutes = boardRoutes.filter(isTrainingRoute).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (!trainingRoutes.length) {
        routeStatus.textContent = 'No training routes yet. Create one from an existing route.';
        updateControls();
        return;
      }

      routeStatus.textContent = `${trainingRoutes.length} training route${trainingRoutes.length === 1 ? '' : 's'} available`;
      trainingRoutes.forEach((routeData) => {
        const item = dce({el: 'LI', cssClass: 'training-route-item'});
        const choose = dce({el: 'BUTTON', cssClass: 'btn btn_white training-route-choice'});
        choose.type = 'button';
        choose.textContent = `${routeData.name || 'Unnamed route'}${globals.grades.font[routeData.grade] ? ` · ${globals.grades.font[routeData.grade]}` : ''}`;
        const selected = selectedRouteIds.includes(routeData.id);
        choose.setAttribute('aria-pressed', String(selected));
        if (selected) {
          choose.classList.remove('btn_white');
          choose.classList.add('is-selected');
        }
        choose.addEventListener('click', () => {
          selectedRouteIds = selectedRouteIds.includes(routeData.id)
            ? selectedRouteIds.filter((id) => id !== routeData.id)
            : [...selectedRouteIds, routeData.id];
          renderRouteList();
          renderSelectedRoutes();
        });
        item.appendChild(choose);
        routeList.appendChild(item);
      });
      updateControls();
    };

    const writeSessionState = async (nextState) => {
      saving = true;
      updateControls();
      try {
        await setDoc(doc(db, 'trainingSessions', globals.board), {
          boardId: globals.board,
          status: nextState,
          startDelaySeconds: 5,
          holdIntervalSeconds: Number(holdIntervalInput.value),
          routeIds: [...selectedRouteIds],
          routes: selectedTrainingRoutes().map((routeData) => ({
            routeId: routeData.id,
            lightingOrder: getLightingGroups(routeData).map((holds) => ({holds: [...holds]}))
          })),
          restSeconds: Number(restInput.value),
          currentRouteIndex: activeRouteIndex,
          currentStepIndex,
          updatedAt: serverTimestamp()
        }, {merge: true});
      } catch (error) {
        console.error('Failed to update training session:', error);
        sessionStatus.textContent = 'Could not update training session. Check your connection and try again.';
      } finally {
        saving = false;
        updateControls();
      }
    };

    const holdIntervalMilliseconds = () => Math.max(100, Number(holdIntervalInput.value) * 1000);

    const updateActiveProgress = (elapsedMs) => {
      const routeData = selectedTrainingRoutes()[activeRouteIndex];
      if (!routeData) return;
      const groups = getRouteGroups(routeData);
      const intervalMs = holdIntervalMilliseconds();
      currentStepIndex = Math.min(groups.length - 1, Math.floor(elapsedMs / intervalMs));
      routeProgress.set(routeData.id, Math.min(100, (elapsedMs / routeDurationMs) * 100));
      updateProgressRows();
    };

    const startRoute = (routeIndex) => {
      const routes = selectedTrainingRoutes();
      if (routeIndex >= routes.length) {
        if (sessionTimer !== null) window.clearInterval(sessionTimer);
        sessionTimer = null;
        sessionState = 'complete';
        countdownShadow.hidden = true;
        activeRouteIndex = -1;
        sessionStatus.textContent = `Training complete · ${routes.length} routes finished.`;
        updateProgressRows();
        updateControls();
        void writeSessionState('complete');
        return;
      }

      const routeData = routes[routeIndex];
      const groups = getRouteGroups(routeData);
      countdownShadow.hidden = true;
      pauseButton.focus();
      activeRouteIndex = routeIndex;
      currentStepIndex = 0;
      sessionState = 'running';
      routeStartedAt = Date.now();
      routeDurationMs = Math.max(1, groups.length * holdIntervalMilliseconds());
      phaseDurationMs = routeDurationMs;
      phaseDeadline = routeStartedAt + routeDurationMs;
      lastCountdownValue = null;
      routeProgress.set(routeData.id, 0);
      sessionStatus.textContent = `Route ${routeIndex + 1} of ${routes.length} · Step 1 of ${groups.length}`;
      updateProgressRows();
      updateControls();
      void writeSessionState('running');
    };

    const finishRoute = (now) => {
      const routes = selectedTrainingRoutes();
      const completedRoute = routes[activeRouteIndex];
      if (completedRoute) routeProgress.set(completedRoute.id, 100);
      updateProgressRows();

      if (activeRouteIndex >= routes.length - 1) {
        startRoute(routes.length);
        return;
      }

      const restMilliseconds = Number(restInput.value) * 1000;
      if (restMilliseconds <= 0) {
        startRoute(activeRouteIndex + 1);
        return;
      }

      sessionState = 'resting';
      phaseDurationMs = restMilliseconds;
      phaseDeadline = now + restMilliseconds;
      lastCountdownValue = null;
      sessionStatus.textContent = `Resting before route ${activeRouteIndex + 2} of ${routes.length}`;
      updateControls();
      void writeSessionState('resting');
    };

    const tickSession = () => {
      if (!page.isConnected) {
        if (sessionTimer !== null) window.clearInterval(sessionTimer);
        sessionTimer = null;
        return;
      }

      const now = Date.now();
      if (sessionState === 'countdown') {
        const remaining = Math.max(0, phaseDeadline - now);
        const seconds = Math.ceil(remaining / 1000);
        if (seconds !== lastCountdownValue) {
          lastCountdownValue = seconds;
          countdownNumber.textContent = String(seconds);
        }
        if (remaining <= 0) startRoute(0);
        return;
      }

      if (sessionState === 'running') {
        const elapsed = Math.max(0, now - routeStartedAt);
        const routeData = selectedTrainingRoutes()[activeRouteIndex];
        const groups = routeData ? getRouteGroups(routeData) : [];
        const nextStep = Math.min(groups.length - 1, Math.floor(elapsed / holdIntervalMilliseconds()));
        if (nextStep !== currentStepIndex) {
          currentStepIndex = nextStep;
          sessionStatus.textContent = `Route ${activeRouteIndex + 1} of ${selectedRouteIds.length} · Step ${currentStepIndex + 1} of ${groups.length}`;
        }
        if (routeData) routeProgress.set(routeData.id, Math.min(100, (elapsed / routeDurationMs) * 100));
        updateProgressRows();
        if (elapsed >= routeDurationMs) finishRoute(now);
        return;
      }

      if (sessionState === 'resting') {
        const remaining = Math.max(0, phaseDeadline - now);
        const seconds = Math.ceil(remaining / 1000);
        if (seconds !== lastCountdownValue) {
          lastCountdownValue = seconds;
          sessionStatus.textContent = `Rest ${seconds}s · next route ${activeRouteIndex + 2} of ${selectedRouteIds.length}`;
        }
        if (remaining <= 0) startRoute(activeRouteIndex + 1);
      }
    };

    const startSessionClock = () => {
      if (sessionTimer !== null) window.clearInterval(sessionTimer);
      sessionTimer = window.setInterval(tickSession, 100);
      tickSession();
    };

    const startSession = () => {
      const routes = selectedTrainingRoutes();
      if (!routes.length || !routes.every((routeData) => getRouteGroups(routeData).length > 0)) return;
      if (!restInput.reportValidity() || !holdIntervalInput.reportValidity()) return;

      resetRouteProgress();
      activeRouteIndex = -1;
      currentStepIndex = -1;
      sessionState = 'countdown';
      phaseDurationMs = 5000;
      phaseDeadline = Date.now() + phaseDurationMs;
      lastCountdownValue = null;
      countdownShadow.hidden = false;
      countdownNumber.textContent = '5';
      sessionStatus.textContent = 'Training starts in five seconds.';
      updateControls();
      void writeSessionState('countdown');
      cancelCountdownButton.focus();
      startSessionClock();
    };

    const pauseOrResumeSession = () => {
      if (sessionState === 'paused') {
        sessionState = pausedPhase;
        phaseDeadline = Date.now() + pausedRemainingMs;
        if (sessionState === 'running') routeStartedAt = Date.now() - (routeDurationMs - pausedRemainingMs);
        pausedPhase = null;
        countdownShadow.hidden = sessionState !== 'countdown';
        if (sessionState === 'countdown') countdownNumber.textContent = String(Math.ceil(pausedRemainingMs / 1000));
        sessionStatus.textContent = sessionState === 'countdown'
          ? 'Training starts when countdown ends.'
          : sessionState === 'resting' ? 'Rest resumed.' : 'Training resumed.';
        updateControls();
        void writeSessionState(sessionState);
        startSessionClock();
        return;
      }

      if (!['countdown', 'running', 'resting'].includes(sessionState)) return;
      pausedPhase = sessionState;
      pausedRemainingMs = Math.max(0, phaseDeadline - Date.now());
      if (sessionState === 'running') updateActiveProgress(routeDurationMs - pausedRemainingMs);
      if (sessionState === 'countdown') countdownShadow.hidden = true;
      if (sessionTimer !== null) window.clearInterval(sessionTimer);
      sessionTimer = null;
      sessionState = 'paused';
      sessionStatus.textContent = 'Paused. Press Resume to continue.';
      updateControls();
      void writeSessionState('paused');
    };

    const stopSession = () => {
      if (sessionTimer !== null) window.clearInterval(sessionTimer);
      sessionTimer = null;
      sessionState = 'stopped';
      activeRouteIndex = -1;
      currentStepIndex = -1;
      pausedPhase = null;
      lastCountdownValue = null;
      countdownShadow.hidden = true;
      resetRouteProgress();
      sessionStatus.textContent = 'Training stopped. All route progress reset.';
      updateControls();
      void writeSessionState('stopped');
    };

    playButton.addEventListener('click', startSession);
    cancelCountdownButton.addEventListener('click', stopSession);
    pauseButton.addEventListener('click', pauseOrResumeSession);
    stopButton.addEventListener('click', stopSession);
    restInput.addEventListener('input', () => {
      if (sessionState === 'stopped') renderSelectedRoutes();
    });
    holdIntervalInput.addEventListener('input', () => {
      if (sessionState === 'stopped') renderSelectedRoutes();
    });

    const routesQuery = query(collection(db, 'routes'), where('napakboard', '==', globals.board));
    let unsubscribe = () => {};
    unsubscribe = onSnapshot(routesQuery, (snapshot) => {
      if (!page.isConnected) {
        unsubscribe();
        return;
      }
      boardRoutes = snapshot.docs.map((routeDoc) => ({id: routeDoc.id, ...routeDoc.data()}));
      renderRouteList();
      renderSelectedRoutes();
    }, (error) => {
      console.error('Failed to load training routes:', error);
      routeStatus.textContent = 'Could not load routes. Check your connection and try again.';
    });

    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
      const pageObserver = new MutationObserver(() => {
        if (!page.isConnected) {
          unsubscribe();
          pageObserver.disconnect();
        }
      });
      pageObserver.observe(pageContent, {childList: true});
    }

    this.render = () => page;
  }
}

export default viewTraining;
