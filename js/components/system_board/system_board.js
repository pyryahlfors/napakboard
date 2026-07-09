import { dce, storeObserver } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { BoardRenderer } from './board-renderer.js';
import { RouteListManager } from './route-list.js';
import { RouteEditor } from './route-editor.js';
import { RouteTicker } from './route-ticker.js';
import { calculateRouteTickStats } from './route-utils.js';


class systemBoard {
    constructor() {
		this.snapContainer = dce({el: 'div', cssClass: 'snap-container'})
        this.boardContainerWrapper = dce({el: 'div', cssClass:'board-wrapper'});
        this.boardContainer = dce({el: 'div', cssClass:`board-container ${globals.board.toLowerCase()}`});
		this.routeCommentsHelp = dce({el: 'div', cssClass: 'swipe-help'});
		this.routeCommentsHelp.innerHTML = "Swipe right for route info";

        this.routeComments = dce({el: 'section', cssStyle: 'background: #111; width: 100vw; flex-shrink: 0; scroll-snap-align: start; padding: 2ch; box-sizing: border-box; min-height: calc(100vh - 80px);'});
        this.routeCommentsBody = dce({el: 'div', cssStyle: 'max-width: 52rem; margin: 0 auto; display: grid; gap: 1rem;'});
        this.routeComments.append(this.routeCommentsBody);

        this.syncRouteCache = (routeId, routeData) => {
            const routeWithId = { ...routeData, id: routeId };
            const existingRouteIndex = globals.boardRoutes.findIndex((route) => route.id === routeId);
            if(existingRouteIndex >= 0) {
                globals.boardRoutes[existingRouteIndex] = routeWithId;
                globals.boardRoutes = [...globals.boardRoutes];
            } else {
                globals.boardRoutes = [...globals.boardRoutes, routeWithId];
            }
        };

        this.renderRouteComments = () => {
            this.routeCommentsBody.innerHTML = '';

            const routeData = globals.boardRoutes.find((route) => route.id === globals.selectedRouteId);
            if(!routeData) {
                const emptyTitle = dce({el: 'h2', cssStyle: 'margin: 0 0 0.5rem;', content: 'Route info'});
                const emptyText = dce({el: 'p', cssStyle: 'margin: 0; opacity: 0.75;', content: 'Select a route to see ascent stats and comments.'});
                this.routeCommentsBody.append(emptyTitle, emptyText);
                return;
            }

            const stats = calculateRouteTickStats(routeData);
            const gradeSummary = stats.gradeConsensus === 'No votes'
                ? 'No votes'
                : `${stats.gradeConsensus} ${stats.gradeAccuracy}%`;
            const approvalSummary = stats.approvalConsensus === 'Liked'
                ? `♥️ ${stats.approval}%`
                : stats.approvalConsensus === 'Disliked'
                    ? `💩 ${stats.approval}%`
                    : stats.approvalConsensus === 'Split'
                        ? `Split ${stats.approval}%`
                        : 'No votes';
            const title = dce({el: 'h2', cssStyle: 'margin: 0;', content: routeData.name || 'Route info'});
            const routeDate = routeData.added && routeData.added.toDate ? routeData.added.toDate() : null;
            const routeDateString = routeDate ? routeDate.toLocaleDateString() : '';
            const subtitle = dce({el: 'p', cssStyle: 'margin: 0; opacity: 0.75;', content: `${globals.grades.font[routeData.grade] || ''} · ${routeData.setter || 'Unknown setter'}${routeDateString ? ` · ${routeDateString}` : ''}`});
            const summaryGrid = dce({el: 'div', cssStyle: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.75rem;'});

            const statCard = (label, value) => {
                const card = dce({el: 'div', cssStyle: 'background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 1rem;'});
                card.append(
                    dce({el: 'div', cssStyle: 'font-size: 0.8rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.06em;', content: label}),
                    dce({el: 'div', cssStyle: 'font-size: 1.8rem; font-weight: 700; margin-top: 0.25rem;', content: `${value}`})
                );
                return card;
            };

            summaryGrid.append(
                statCard('Ticks', stats.totalTicks),
                statCard('Grade', gradeSummary),
                statCard('Approval', approvalSummary)
            );

            const ascentSplit = dce({el: 'section', cssClass: 'route-stats-card'});
            const graphContainer = dce({el: 'div', cssClass: 'graph-container'});
            const gradeContainer = dce({el: 'div', cssClass: 'grade-container'});
            gradeContainer.append(dce({el: 'h3', content: `Redpoint (${stats.redpoints})`}));

            const barsContainer = dce({el: 'div', cssClass: 'bars-container'});
            if(stats.redpoints + stats.flashes > 0) {
                const redpointBar = dce({el: 'span', cssClass: 'redpoint', content: stats.redpoints > 0 ? `${stats.redpointPercentage}%` : ''});
                redpointBar.style.setProperty('--count', `${stats.redpointPercentage}%`);

                const flashBar = dce({el: 'span', cssClass: 'flash', content: stats.flashes > 0 ? `${stats.flashPercentage}%` : ''});
                flashBar.style.setProperty('--count', `${stats.flashPercentage}%`);

                barsContainer.append(redpointBar, flashBar);
            }

            const gradeTotal = dce({el: 'div', cssClass: 'grade-total'});
            gradeTotal.append(dce({el: 'h3', content: `Flash (${stats.flashes})`}));

            graphContainer.append(gradeContainer, barsContainer, gradeTotal);
            ascentSplit.append(graphContainer);
            if(stats.redpoints + stats.flashes === 0) {
                ascentSplit.append(dce({el: 'p', cssStyle: 'opacity: 0.75; margin: 0.75rem 0 0;', content: 'No ascent data yet'}));
            }

            const commentsHeader = dce({el: 'h3', cssStyle: 'margin: 0.5rem 0 0;', content: 'Comments'});
            const commentsList = dce({el: 'div', cssStyle: 'display: grid; gap: 0.75rem;'});

            if(!stats.comments.length) {
                commentsList.append(dce({el: 'p', cssStyle: 'margin: 0; opacity: 0.75;', content: 'No comments yet.'}));
            } else {
                stats.comments.slice(0, 10).forEach((entry) => {
                    const commentCard = dce({el: 'article', cssStyle: 'background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 1rem;'});
                    const commentDate = entry.date ? new Date(entry.date).toLocaleString() : '';
                    const commentType = entry.type === 'redpoint' ? 'Redpoint' : 'Flash';
                    const commentHeader = dce({el: 'div', cssStyle: 'display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem;'});
                    commentHeader.append(
                        dce({el: 'strong', content: entry.userName || 'Anonymous'}),
                        dce({el: 'span', cssStyle: 'opacity: 0.7;', content: `${commentType}${commentDate ? ` · ${commentDate}` : ''}`})
                    );
                    const commentBody = dce({el: 'p', cssStyle: 'margin: 0; white-space: pre-wrap; line-height: 1.5;', content: entry.comment});
                    commentCard.append(commentHeader, commentBody);
                    commentsList.append(commentCard);
                });
            }

            this.routeCommentsBody.append(title, subtitle, summaryGrid, ascentSplit, commentsHeader, commentsList);
        };


		this.snapContainer.append(this.boardContainerWrapper, this.routeComments);
        this.db = getFirestore();

        // Initialize sub-managers
        this.boardRenderer = new BoardRenderer(() => this.updateBoardData());
        this.routeListManager = new RouteListManager(this.db, (routeId) => this.loadRoute(routeId));
        this.routeEditor = new RouteEditor(this.boardContainer, this.db);
        this.routeTicker = new RouteTicker(this.db);

        storeObserver.add({
            store: globals,
            key: 'board',
            id: 'systemBoardSelect',
            callback: () => {
                this.boardContainer.className = `board-container ${globals.board.toLowerCase()}`;
                globals.selectedRoute = null;
                globals.selectedRouteId = null;
                this.changeBoard();
            }
        });

        storeObserver.add({
            store: globals,
            key: 'lightsOn',
            id: 'lightsToggle',
            callback: () => this.updateBoardData()
        });

        storeObserver.add({
            store: globals,
            key: 'selectedRouteId',
            id: 'systemBoardRouteComments',
            callback: () => this.renderRouteComments()
        });

        storeObserver.add({
            store: globals,
            key: 'boardRoutes',
            id: 'systemBoardRouteCommentsData',
            callback: () => this.renderRouteComments()
        });

        this.changeBoard();
        this.renderRouteComments();
    }

    changeBoard() {
        this.loadBoardSetup();
    }

    getHoldSetup() {
        return this.boardRenderer.getHoldSetup();
    }

    loadBoardSetup(fromGlobals) {
        this.boardContainerWrapper.innerHTML = "";
        this.boardContainer.innerHTML = "";
        this.boardContainerWrapper.append(this.boardContainer, this.routeCommentsHelp);

        ( async () => {
            // Ensure hold setup is loaded before rendering
            // Wait a bit for the SVG to load, but don't block forever
            await Promise.race([
                this.boardRenderer.getHoldSetup(),
                new Promise(resolve => setTimeout(resolve, 100)) // 100ms timeout
            ]).catch((error) => {
                console.warn('Hold setup loading did not complete in time, rendering with fallback:', error);
            });

            const docRef = doc(this.db, "boardSetup", globals.board);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().boardSetup ) {
                this.boardRenderer.drawHolds(this.boardContainer, fromGlobals ? fromGlobals : docSnap.data().boardSetup);
            } else {
                fetch(`/hold_setup.json?doUpdate=${new Date().getTime()}`)
                .then(response => response.json())
                .then(data => {
                    if(fromGlobals) data = fromGlobals;
                    this.boardRenderer.drawHolds(this.boardContainer, data);
                })
            }

            // Load route if one is selected (give board time to render first)
            if(globals.selectedRouteId) {
                await new Promise(resolve => setTimeout(resolve, 50));
                this.loadRoute(globals.selectedRouteId)
            }
        })();
    }

    loadRoute(routeId) {
        this.routeEditor.clearRoute();
        ( async () => {
            const docRef = doc(this.db, "routes", routeId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                let routeData = docSnap.data();
                let holdSetup = routeData.holdSetup;

                // Keep board route cache in sync so ticker can render route legend immediately.
                this.syncRouteCache(routeId, routeData);

                globals.selectedRoute = routeData['name'];
                globals.selectedRouteId = routeId;

                this.boardRenderer.updateRouteDisplay(this.boardContainer, holdSetup);
                this.updateBoardData();
            }
        })();
    }

    list() {
        this.routeListManager.open();
    }

    next() {}

    clear() {
        this.routeEditor.openClearDialog();
    }

    save() {
        this.routeEditor.openSaveDialog(() => this.loadBoardSetup(globals.boardSetup));
    }

    tick() {
        this.routeTicker.open();
    }

    updateBoardData() {
        if(globals.lightsOn) {
            let selected = this.boardContainer.querySelectorAll('.selected');
            let holdSetup = {};
            selected.forEach((hold) => {
                let holdType = 'intermediate';
                if(hold.classList.contains('top')) {holdType = 'top'}
                if(hold.classList.contains('start')) {holdType = 'start'}
                if(hold.classList.contains('foot')) {holdType = 'foot'}
                holdSetup[hold.id] = holdType;
            });

            (async () => {
                const routeRef = doc(this.db, "current", `currentRoute_${globals.board}`);

                await setDoc(routeRef, {
                    routeData: {holdSetup: holdSetup},
                    routeName: globals.selectedRoute || 'Unsaved route',
                    routeId: globals.selectedRouteId || 'No id',
                    boardId: globals.board
                });
            })();
        }
    }

    render() {
        return this.snapContainer;
    }
}

export default systemBoard;
