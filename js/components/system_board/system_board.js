import { dce, storeObserver } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { BoardRenderer } from './board-renderer.js';
import { RouteListManager } from './route-list.js';
import { RouteEditor } from './route-editor.js';
import { RouteTicker } from './route-ticker.js';


class systemBoard {
    constructor() {
        this.boardContainerWrapper = dce({el: 'div', cssClass:'board-wrapper'});
        this.boardContainer = dce({el: 'div', cssClass:`board-container ${globals.board.toLowerCase()}`});
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

        this.changeBoard();
    }

    changeBoard() {
        this.loadBoardSetup();
    }

    getHoldSetup() {
        this.boardRenderer.getHoldSetup();
    }

    loadBoardSetup(fromGlobals) {
        this.boardContainerWrapper.innerHTML = "";
        this.boardContainer.innerHTML = "";
        this.boardContainerWrapper.append(this.boardContainer);

        ( async () => {
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
        })();

        if(globals.selectedRouteId) {
            this.loadRoute(globals.selectedRouteId)
        }
    }

    loadRoute(routeId) {
        this.routeEditor.clearRoute();
        ( async () => {
            const docRef = doc(this.db, "routes", routeId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                let routeData = docSnap.data();
                let holdSetup = routeData.holdSetup;

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
        return this.boardContainerWrapper;
    }
}

export default systemBoard;
