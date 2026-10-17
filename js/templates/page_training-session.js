import { collection, doc, getDoc, getFirestore, onSnapshot, query, serverTimestamp, setDoc, where } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';
import { globals } from '../shared/globals.js';
import { route } from '../shared/route.js';
import bottomNavi from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js?training';
import dsLegend from '../components/ds-legend/index.js';
import dsQuantity from '../components/ds-quantity/index.js';

const isTrainingRoute = (routeData) => {
	if (routeData.archived) return false;
	const tags = Array.isArray(routeData.tags) ? routeData.tags : [routeData.tags];
	return routeData.training === true || tags.some((tag) => typeof tag === 'string' && tag.toLowerCase() === 'training');
};

const getLightingGroups = (routeData, includeStartGroups = false) => (Array.isArray(routeData.lightingOrder) ? routeData.lightingOrder : [])
	.map((entry) => {
		const holds = Array.isArray(entry) ? entry : Array.isArray(entry && entry.holds) ? entry.holds : [entry];
		if (!includeStartGroups && holds.some((holdId) => {
			const hold = (routeData.holdSetup || {})[holdId];
			return (typeof hold === 'string' ? hold : hold && hold.type) === 'start';
		})) return [];
		return holds.filter((holdId) => {
			if (typeof holdId !== 'string') return false;
			const hold = (routeData.holdSetup || {})[holdId];
			return includeStartGroups || (typeof hold === 'string' ? hold : hold && hold.type) !== 'start';
		});
	})
	.filter((group) => group.length > 0);

class viewTraining {
	constructor() {
		const pageTemplate = document.createElement('template');
		pageTemplate.innerHTML = `
			<main class="page-training">
				<div class="training-content">
					<section class="training-session">
						<div class="training-settings">
							<h2>Session settings</h2>
							<div class="training-session-settings">
								<label>
									Rest between routes (seconds)
									<input type="number" inputmode="numeric" name="training-rest" min="0" max="3600" value="30">
								</label>
								<label>
									Minimum delay between holds (seconds)
									<input type="text" inputmode="decimal" name="training-hold-interval" min="1" max="60" step="0.1" value="1" required>
								</label>
							</div>
						</div>
						<div class="training-routes striped">
							<h2>Routes</h2>
							<p class="training-status" role="status" aria-live="polite">Loading routes…</p>
							<ul class="training-route-list"></ul>
						</div>
						<div class="training-session-order">
							<h3>Session order</h3>
							<ol class="training-selected-routes"></ol>
						</div>
						<div class="training-session-controls">
							<div class="control-buttons">
								<button type="button" class="btn training-play">Play</button>
								<button type="button" class="btn btn_white training-pause" disabled>Pause</button>
								<button type="button" class="btn destructive training-stop" disabled>Stop</button>
							</div>
							<p class="training-session-status" role="status" aria-live="off">Select routes to prepare a session.</p>
						</div>
					</section>
				</div>
			</main>
		`;
		const page = pageTemplate.content.firstElementChild;
		const ticker = new statusTicker({interactive: false, title: 'Training'});
		const routeStatus = page.querySelector('.training-status');
		const routeList = page.querySelector('.training-route-list');
		const selectedRoutes = page.querySelector('.training-selected-routes');
		const settings = page.querySelector('.training-session-settings');
		const restInput = page.querySelector('[name="training-rest"]');
		const holdIntervalInput = page.querySelector('[name="training-hold-interval"]');
		const sessionStatus = page.querySelector('.training-session-status');
		const playButton = page.querySelector('.training-play');
		const pauseButton = page.querySelector('.training-pause');
		const stopButton = page.querySelector('.training-stop');
		restInput.replaceWith(new dsQuantity({input: restInput}));
		holdIntervalInput.replaceWith(new dsQuantity({input: holdIntervalInput}));

		const selectedRouteTemplate = document.createElement('template');
		selectedRouteTemplate.innerHTML = `
			<li class="training-selected-route">
				<span class="training-route-progress" aria-hidden="true">
					<span class="training-route-progress-fill"></span>
				</span>
				<div class="training-selected-route-details">
					<span data-route-name></span>
					<span class="training-route-info"></span>
				</div>
				<div class="training-order-controls">
					<button type="button" class="btn btn_tiny" data-action="up">↑</button>
					<button type="button" class="btn btn_tiny" data-action="down">↓</button>
					<button type="button" class="btn btn_tiny destructive" data-action="remove">Remove</button>
				</div>
			</li>
		`;
		const routeTemplate = document.createElement('template');
		routeTemplate.innerHTML = `
			<li class="training-route-item">
				<button type="button" class="btn btn_white training-route-choice"></button>
			</li>
		`;

		const getHoldIntervalSeconds = () => {
			const value = holdIntervalInput.value.trim().replace(',', '.');
			return /^\d+(?:\.\d*)?$/.test(value) ? Number(value) : NaN;
		};
		const validateHoldInterval = () => {
			const seconds = getHoldIntervalSeconds();
			holdIntervalInput.setCustomValidity(Number.isFinite(seconds) && seconds >= 1 && seconds <= 60
				? ''
				: 'Enter a delay between 1 and 60 seconds, using a comma or dot for decimals.');
		};

		const footerNavi = new bottomNavi({options: {
			list: {
				title: 'Exit training',
				icon: 'climb',
				link: () => route('board')
			},
			createTrainingRoute: {
				title: 'Create route',
				icon: 'light',
				link: () => route('trainingRoute')
			}
		}});
		page.prepend(ticker.render());
		page.append(footerNavi.render());

		const db = getFirestore();
		let boardRoutes = [];
		let selectedRouteIds = [];
		let sessionState = 'stopped';
		let saving = false;
		let sessionTimer = null;
		let boardStartTimer = null;
		let latestBoardStatus = null;
		let trainingSessionId = null;
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
			stopButton.disabled = saving || !active;
			restInput.disabled = locked;
			holdIntervalInput.disabled = locked;
			settings.querySelectorAll('button').forEach((button) => { button.disabled = locked; });
			routeList.querySelectorAll('button').forEach((button) => { button.disabled = locked; });
			selectedRoutes.querySelectorAll('button').forEach((button) => { button.disabled = locked; });
		};

		const renderSelectedRoutes = () => {
			selectedRoutes.replaceChildren();
			routeProgressElements = new Map();
			selectedRouteIds = selectedRouteIds.filter((id) => boardRoutes.some((routeData) => routeData.id === id && isTrainingRoute(routeData)));

			selectedTrainingRoutes().forEach((routeData, index) => {
				const item = selectedRouteTemplate.content.firstElementChild.cloneNode(true);
				const routeName = item.querySelector('[data-route-name]');
				routeName.textContent = routeData.name || 'Unnamed route';
				const lightingGroups = getLightingGroups(routeData);
				const holdCount = lightingGroups.reduce((count, group) => count + group.length, 0);
				const routeInfo = item.querySelector('.training-route-info');
				routeInfo.textContent = `${lightingGroups.length} steps · ${holdCount} holds`;
				const progressFill = item.querySelector('.training-route-progress-fill');
				routeProgressElements.set(routeData.id, {item, fill: progressFill, routeInfo, lightingGroups});
				if (!routeProgress.has(routeData.id)) routeProgress.set(routeData.id, 0);

				const moveUp = item.querySelector('[data-action="up"]');
				moveUp.setAttribute('aria-label', `Move ${routeData.name} up`);
				moveUp.disabled = index === 0;
				moveUp.addEventListener('click', () => {
					[selectedRouteIds[index - 1], selectedRouteIds[index]] = [selectedRouteIds[index], selectedRouteIds[index - 1]];
					renderSelectedRoutes();
					renderRouteList();
				});

				const moveDown = item.querySelector('[data-action="down"]');
				moveDown.setAttribute('aria-label', `Move ${routeData.name} down`);
				moveDown.disabled = index === selectedRouteIds.length - 1;
				moveDown.addEventListener('click', () => {
					[selectedRouteIds[index + 1], selectedRouteIds[index]] = [selectedRouteIds[index], selectedRouteIds[index + 1]];
					renderSelectedRoutes();
					renderRouteList();
				});

				const remove = item.querySelector('[data-action="remove"]');
				remove.addEventListener('click', () => {
					selectedRouteIds = selectedRouteIds.filter((id) => id !== routeData.id);
					renderSelectedRoutes();
					renderRouteList();
				});

				selectedRoutes.appendChild(item);
			});

			updateProgressRows();

			if (sessionState === 'stopped') {
				sessionStatus.textContent = selectedRouteIds.length
					? `${selectedRouteIds.length} route${selectedRouteIds.length === 1 ? '' : 's'} selected · ${restInput.value}s rest · minimum ${holdIntervalInput.value}s between holds.`
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
				const item = routeTemplate.content.firstElementChild.cloneNode(true);
				const choose = item.querySelector('.training-route-choice');

				choose.textContent = `${routeData.name || 'Unnamed route'}`;
				let routeGrade = new dsLegend({title: globals.grades.font[routeData.grade], type: 'grade', cssClass: globals.difficulty[routeData.grade]})
				choose.append(routeGrade);

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
					mode: 'training',
					sessionId: trainingSessionId,
					updatedBy: 'client',
					status: nextState,
					startDelaySeconds: 5,
					holdIntervalSeconds: getHoldIntervalSeconds(),
					routeIds: [...selectedRouteIds],
					routes: selectedTrainingRoutes().map((routeData) => ({
						routeId: routeData.id,
						routeName: routeData.name || 'Unnamed route',
						holdSetup: routeData.holdSetup,
						lightingOrder: getLightingGroups(routeData, true).map((holds) => ({holds: [...holds]}))
					})),
					restSeconds: Number(restInput.value),
					currentRouteIndex: activeRouteIndex,
					currentStepIndex,
					updatedAt: serverTimestamp()
				}, {merge: true});
				return true;
			} catch (error) {
				console.error('Failed to update training session:', error);
				sessionStatus.textContent = 'Could not update training session. Check your connection and try again.';
				return false;
			} finally {
				saving = false;
				updateControls();
			}
		};

		const holdIntervalMilliseconds = () => Math.max(100, getHoldIntervalSeconds() * 1000);

		const getGroupDurationMs = (routeData, group) => {
			const hasTopHold = group.some((holdId) => {
				const hold = (routeData.holdSetup || {})[holdId];
				return (typeof hold === 'string' ? hold : hold && hold.type) === 'top';
			});
			return Math.max(holdIntervalMilliseconds(), hasTopHold ? 3180 : 0);
		};

		const getStepIndex = (routeData, elapsedMs) => {
			const groups = getRouteGroups(routeData);
			let remainingMs = elapsedMs;
			for (let index = 0; index < groups.length; index += 1) {
				remainingMs -= getGroupDurationMs(routeData, groups[index]);
				if (remainingMs < 0) return index;
			}
			return groups.length - 1;
		};

		const updateActiveProgress = (elapsedMs) => {
			const routeData = selectedTrainingRoutes()[activeRouteIndex];
			if (!routeData) return;
			currentStepIndex = getStepIndex(routeData, elapsedMs);
			routeProgress.set(routeData.id, Math.min(100, (elapsedMs / routeDurationMs) * 100));
			updateProgressRows();
		};

		const startRoute = (routeIndex) => {
			window.clearTimeout(boardStartTimer);
			boardStartTimer = null;
			const routes = selectedTrainingRoutes();
			if (routeIndex >= routes.length) {
				if (sessionTimer !== null) window.clearInterval(sessionTimer);
				sessionTimer = null;
				sessionState = 'complete';
				activeRouteIndex = -1;
				sessionStatus.textContent = `Training complete · ${routes.length} routes finished.`;
				updateProgressRows();
				updateControls();
				void writeSessionState('complete');
				return;
			}

			const routeData = routes[routeIndex];
			const groups = getRouteGroups(routeData);
			pauseButton.focus();
			activeRouteIndex = routeIndex;
			currentStepIndex = 0;
			sessionState = 'running';
			routeStartedAt = Date.now();
			routeDurationMs = Math.max(1, groups.reduce((duration, group) => duration + getGroupDurationMs(routeData, group), 0));
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
			if (sessionState === 'running') {
				const elapsed = Math.max(0, now - routeStartedAt);
				const routeData = selectedTrainingRoutes()[activeRouteIndex];
				const groups = routeData ? getRouteGroups(routeData) : [];
				const nextStep = routeData ? getStepIndex(routeData, elapsed) : -1;
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

		const waitForBoardStart = () => {
			window.clearTimeout(boardStartTimer);
			boardStartTimer = window.setTimeout(() => {
				boardStartTimer = null;
				if (!page.isConnected || sessionState !== 'countdown') return;
				const status = latestBoardStatus;
				sessionStatus.textContent = status && status.trainingSessionId === trainingSessionId
					? `${globals.board} acknowledged training, but has not started. Board status: ${status.trainingStatus || 'unknown'}.`
					: `${globals.board} has not acknowledged training. Last board report: ${status && (status.statusReason || status.trainingStatus) || 'no status available'}.`;
			}, 12000);
		};

		const startSession = () => {
			const routes = selectedTrainingRoutes();
			if (!routes.length || !routes.every((routeData) => getRouteGroups(routeData).length > 0)) return;
			validateHoldInterval();
			if (!restInput.reportValidity() || !holdIntervalInput.reportValidity()) return;

			trainingSessionId = `${globals.board}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
			resetRouteProgress();
			activeRouteIndex = -1;
			currentStepIndex = -1;
			sessionState = 'countdown';
			phaseDurationMs = 5000;
			phaseDeadline = Date.now() + phaseDurationMs;
			lastCountdownValue = null;
			sessionStatus.textContent = 'Starting…';
			updateControls();
			void writeSessionState('countdown').then((saved) => {
				if (saved && sessionState === 'countdown') waitForBoardStart();
			});
			pauseButton.focus();
		};

		const pauseOrResumeSession = () => {
			if (sessionState === 'paused') {
				sessionState = pausedPhase;
				phaseDeadline = Date.now() + pausedRemainingMs;
				if (sessionState === 'running') routeStartedAt = Date.now() - (routeDurationMs - pausedRemainingMs);
				pausedPhase = null;
				sessionStatus.textContent = sessionState === 'countdown'
					? 'Starting…'
					: sessionState === 'resting' ? 'Rest resumed.' : 'Training resumed.';
				updateControls();
				void writeSessionState(sessionState).then((saved) => {
					if (saved && sessionState === 'countdown') waitForBoardStart();
				});
				if (sessionState !== 'countdown') startSessionClock();
				return;
			}

			if (!['countdown', 'running', 'resting'].includes(sessionState)) return;
			window.clearTimeout(boardStartTimer);
			boardStartTimer = null;
			pausedPhase = sessionState;
			pausedRemainingMs = Math.max(0, phaseDeadline - Date.now());
			if (sessionState === 'running') updateActiveProgress(routeDurationMs - pausedRemainingMs);
			if (sessionTimer !== null) window.clearInterval(sessionTimer);
			sessionTimer = null;
			sessionState = 'paused';
			sessionStatus.textContent = 'Paused. Press Resume to continue.';
			updateControls();
			void writeSessionState('paused');
		};

		const stopSession = (message = 'Training stopped. All route progress reset.', writeState = true) => {
			window.clearTimeout(boardStartTimer);
			boardStartTimer = null;
			if (sessionTimer !== null) window.clearInterval(sessionTimer);
			sessionTimer = null;
			sessionState = 'stopped';
			activeRouteIndex = -1;
			currentStepIndex = -1;
			pausedPhase = null;
			lastCountdownValue = null;
			resetRouteProgress();
			sessionStatus.textContent = message;
			updateControls();
			if (writeState) void writeSessionState('stopped');
		};

		playButton.addEventListener('click', startSession);
		pauseButton.addEventListener('click', pauseOrResumeSession);
		stopButton.addEventListener('click', () => stopSession());
		restInput.addEventListener('input', () => {
			if (sessionState === 'stopped') renderSelectedRoutes();
		});
		holdIntervalInput.addEventListener('input', () => {
			validateHoldInterval();
			if (sessionState === 'stopped') renderSelectedRoutes();
		});

		getDoc(doc(db, 'trainingSessions', globals.board)).then((snapshot) => {
			if (!page.isConnected || !snapshot.exists()) return;
			const session = snapshot.data();
			const savedRest = Number(session.restSeconds);
			const savedHoldInterval = Number(session.holdIntervalSeconds);
			if (Number.isFinite(savedRest) && savedRest >= 0 && savedRest <= 3600) restInput.value = String(savedRest);
			if (Number.isFinite(savedHoldInterval) && savedHoldInterval >= 1 && savedHoldInterval <= 60) {
				holdIntervalInput.value = String(savedHoldInterval);
			}
			renderSelectedRoutes();
		}).catch((error) => {
			console.error('Failed to load training settings for this board:', error);
		});

		let unsubscribeSession = () => {};
		unsubscribeSession = onSnapshot(doc(db, 'trainingSessions', globals.board), (snapshot) => {
			if (!page.isConnected || !snapshot.exists()) return;
			const session = snapshot.data();
			if (session.updatedBy === 'raspberry' && session.status === 'stopped' && sessionState !== 'stopped') {
				stopSession(session.stopReason || 'A normal route was selected. Training stopped.', false);
			}
		}, (error) => {
			console.error('Failed to listen for training session changes:', error);
		});

		const unsubscribeBoardStatus = onSnapshot(doc(db, 'boardStatus', `boardStatus_${globals.board}`), (snapshot) => {
			if (!page.isConnected || !snapshot.exists()) return;
			const status = snapshot.data();
			latestBoardStatus = status;
			if (status.trainingSessionId !== trainingSessionId || sessionState !== 'countdown') return;
			if (status.trainingStatus === 'countdown') {
				phaseDeadline = status.trainingCountdownDeadline;
			} else if (status.trainingStatus === 'running') {
				startRoute(0);
				startSessionClock();
			} else if (status.trainingStatus === 'invalid-training-session') {
				stopSession(`${globals.board} could not start training: no playable routes.`);
			} else if (status.trainingStatus === 'training-route-load-failed') {
				stopSession(`${globals.board} could not start training: route loading failed.`);
			}
		}, (error) => {
			console.error('Failed to listen for training board status:', error);
			if (sessionState === 'countdown') {
				window.clearTimeout(boardStartTimer);
				boardStartTimer = null;
				sessionStatus.textContent = `Could not read ${globals.board}'s status: ${error.code || 'connection error'}.`;
			}
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
					window.clearTimeout(boardStartTimer);
					unsubscribe();
					unsubscribeSession();
					unsubscribeBoardStatus();
					pageObserver.disconnect();
				}
			});
			pageObserver.observe(pageContent, {childList: true});
		}

		this.render = () => page;
	}
}

export default viewTraining;
