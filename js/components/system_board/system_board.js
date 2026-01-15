import { dce, svg, storeObserver} from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import { handleDate } from '../../shared/date.js';
import dsModal  from '../../components/ds-modal/index.js';
import dsButton from '../../components/ds-button/index.js';
import dsInput from '../../components/ds-input/index.js';
import dsSelect from '../../components/ds-select/index.js';
import dsToggle from '../../components/ds-toggle/index.js';
import dsRadio from '../ds-radio/index.js';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getFirestore, getDoc, onSnapshot, query, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'

import dsLegend from '../ds-legend/index.js';

class systemBoard {
    constructor( ) {
        this.boardContainerWrapper = dce({el: 'div', cssClass:'board-wrapper'});
        this.boardContainer = dce({el: 'div', cssClass:`board-container ${globals.board.toLowerCase()}`});
        this.holdTypes = ['intermediate', 'foot', 'start', 'top'];
        this.db = getFirestore();

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

		this.changeBoard = () => {
            this.loadBoardSetup();
        }
/**
 * Get holds
 */
        this.getHoldSetup = () => {
            this.holdImages = svg({el: 'svg', attrbs: [["viewBox","0 0 0 0"]]});

            fetch('/projects/napakboard/images/holds.svg?update=true')
                .then(r => r.text())
                .then(text => {
                    this.holdImages.innerHTML = text;
                    this.loadBoardSetup();
                })
            .catch(console.error.bind(console));
        }


        this.drawHolds = ( data ) => {
            globals.boardSetup = data;
            this.boardHeight = data.characteristics.height;
            this.boardWidth = data.characteristics.width;

            let cellSize = 40;

            this.boardContainer.style.height = `${(this.boardHeight + 1) * cellSize}px`;
            this.boardContainer.style.width= `${(this.boardWidth + 1) * cellSize}px`;


            let oldSheet = document.body.querySelector("#napakgrid");
            if(oldSheet) {
                oldSheet.parentNode.removeChild(oldSheet);
            }

            let toprow = dce({el: 'div', cssStyle: `position: sticky; z-index: 2; top: 0; height: ${cellSize}px`});
            let cellsContainer = dce({el: 'div'});
            for(let i=-1, j=this.boardHeight; i<j;i++) {
                let gridCell = dce({el: 'div', cssStyle: `left: 0; top: 0; height: ${cellSize}px; width: ${cellSize}px`});
                    gridCell.className = "grid-cell"

                for(let k=-1, l=this.boardWidth; k<l;k++) {
                    let gridCell = dce({el: 'div', cssStyle: `left: ${(k+1) * cellSize}px; top: ${(i+1) * cellSize}px; height: ${cellSize}px; width: ${cellSize}px`});
                    gridCell.className = "grid-cell"

                    if(i<0) {
                        gridCell.innerHTML = (k >= 0 ) ? this.boardCols[k] : '';
                        gridCell.classList.add('row-name', 'row-letter')
                        if ( k < 0 ) {
                            gridCell.classList.add('top-corner')
                        }
                    toprow.append(gridCell);
                    }

                    else{
                        if(k<0) {
                            gridCell.innerHTML = this.boardHeight - i;
                            gridCell.classList.add('row-name', 'row-number');
                        }
                        else {
                            let tipSpan = document.createElement("span");
                            if (i===0) {
                                tipSpan.className="tip-below";
                            }
                            gridCell.append(tipSpan);
                            gridCell.id = `${this.boardCols[k]}${i+1}`;
                            gridCell.addEventListener('mousedown', (e) => {
                                e.preventDefault();
                                this.timerStart = new Date().getTime();
                            }, false);

                            gridCell.addEventListener('contextmenu', (e) => {
                                e.preventDefault();
                                let hold = e.target;
                                hold.classList.remove('selected', 'intermediate', 'foot', 'start', 'top');
                                globals.standardMessage = [...globals.standardMessage, { message: `Removed hold from  route`, timeout: 1 }];
                                this.updateBoard();
	                        }, false);

                            gridCell.addEventListener('mouseup', (e) => {
                                e.preventDefault();
                                // prevent adding holds to route
                                if(globals.selectedRoute !== null) return;
                                this.timerEnd = new Date().getTime();
                                let hold = e.target;
                                // Long press to remove hold. Does not work on iOS
                                if(this.timerEnd - this.timerStart < 500) {
                                    let currentHoldType;
                                    let currentHoldOrder;

                                    this.holdTypes = ['intermediate', 'foot', 'start', 'top'];

                                    if(hold.classList.contains('selected')) {
                                        this.holdTypes.forEach((el, count) => {
                                            if(hold.classList.contains(el)) {
                                                currentHoldType = el;
                                                currentHoldOrder = count;
                                            }
                                        })

                                        hold.classList.remove(currentHoldType);

                                        hold.classList.add(this.holdTypes[currentHoldOrder+1]);
                                        if(currentHoldOrder +1 == this.holdTypes.length) {
                                            hold.classList.remove('selected', 'undefined');
                                            globals.standardMessage = [{ message: `Removed hold from ${this.boardCols[k]}${this.boardHeight - i}`, timeout: 1 }];
                                        }
                                        else {
                                            globals.standardMessage = [{ message: `Added - ${this.holdTypes[currentHoldOrder+1]} hold to ${this.boardCols[k]}${this.boardHeight - i}`, timeout: 1 }];
                                        }
                                    }

                                    else {
                                        hold.classList.add('selected', this.holdTypes[0]);
                                        globals.standardMessage = [{ message: `Added - ${this.holdTypes[0]} hold to ${this.boardCols[k]}${this.boardHeight - i}`, timeout: 1 }];

                                    }
                                }
                                else {
                                    hold.classList.remove('selected', 'intermediate', 'foot', 'start', 'top');
                                    globals.standardMessage = [{ message: `Removed hold from ${this.boardCols[k]}${this.boardHeight - i}`, timeout: 1 }];
                                }
                                this.updateBoard();
                            }, false)
                        }
                    }
                if(i>=0) {
                    cellsContainer.appendChild(gridCell);
                    }
                }
            this.boardContainer.append(toprow, cellsContainer);
            }
            /* SETUP CANVAS */
            this.setupCanvas = document.createElement("canvas");
            this.ctx = this.setupCanvas.getContext("2d");

            // Don't change these
            this.holdSize = 30;
            this.cellSize = 40;

            this.setupCanvas.width = this.holdSize * ( this.boardWidth +1 ) * window.devicePixelRatio;
            this.setupCanvas.height = this.holdSize * (this.boardHeight +1 )* window.devicePixelRatio;

            this.setupCanvas.style.width = ((this.boardWidth + 1) * cellSize) + "px";
            this.setupCanvas.style.height = ((this.boardHeight + 1) * cellSize) + "px";

            this.boardContainer.appendChild(this.setupCanvas);

            const dpr = window.devicePixelRatio;

            let boardHolds = {};
            for(let i=0, j=this.boardHeight; i<j;i++) {
                for(let k=0, l=this.boardWidth; k<l;k++) {
                    boardHolds[`${this.boardCols[k]}${i+1}`]  = {};
                }
            }
            data.holdSetup = {...boardHolds, ...data.holdSetup};

            for( let holds in data.holdSetup) {
                let holdCanvas = document.createElement("CANVAS")
                holdCanvas.width = this.holdSize * 2 * window.devicePixelRatio;
                holdCanvas.height = this.holdSize * 2 * window.devicePixelRatio;

                let holdCanvasctx = holdCanvas.getContext("2d");

                const { hold, rotation, scaleY, scaleX, holdColor, offsetX, offsetY, mirror } = data.holdSetup[holds];

				if(mirror) {
					document.getElementById(holds).classList.add('mirrored');
				}
                if(hold || holdColor) {
                    // scale
                    const scaleHold = new Path2D();
                    const scaleXX = ((scaleX ? scaleX*0.01 : 1) * dpr);
                    const scaleYY = ((scaleY ? scaleY*0.01 : 1) * dpr);

                    const scalePosX = holdCanvas.width / 2 - (this.holdSize * scaleXX) / 2;
                    const scalePosY = holdCanvas.height / 2 - (this.holdSize * scaleYY) / 2;

                    // addjust bolt placement
                    const boltOffsetX = offsetX ? (this.holdSize / 100) * offsetX : 0;
                    const boltOffsetY = offsetY ? (this.holdSize / 100) * offsetY : 0;

                    let cloneHold = this.holdImages.querySelector(`[data-name='${hold}']`);
                    if(!this.holdImages.querySelector(`[data-name='${hold}']`)) {
                        cloneHold = this.holdImages.querySelector("[data-name='placeholder']");
                    }

                    const holdPath = new Path2D(cloneHold.cloneNode(true).getAttribute("d"));

                    scaleHold.addPath(holdPath, new DOMMatrix().translate(scalePosX + boltOffsetX * dpr, scalePosY + boltOffsetY * dpr).scale(scaleXX, scaleYY));

                    const transformHold = new Path2D();

                    /// rotation
                    transformHold.addPath(
                        scaleHold,
                        new DOMMatrix()
                            .translate(holdCanvas.width / 2, holdCanvas.height / 2)
                            .rotate(rotation ? rotation : 0)
                            .translate(-holdCanvas.width / 2, -holdCanvas.height / 2),
                        );

                    // ... and then draw it
                    holdCanvasctx.save();
                    holdCanvasctx.shadowColor = 'rgba(0,0,0,.3)';
                    holdCanvasctx.shadowBlur = this.holdSize / 8;
                    holdCanvasctx.fillStyle = holdColor || '#000';
                    holdCanvasctx.lineWidth = 1;
                    holdCanvasctx.fill(transformHold);
                    holdCanvasctx.strokeStyle = 'rgba(0,0,0,.3)';
                    holdCanvasctx.stroke(transformHold);
                    holdCanvasctx.restore();
                    }
                // Bolt
                holdCanvasctx.shadowColor = 'transparent';
                holdCanvasctx.shadowBlur = 0;
                holdCanvasctx.arc(holdCanvas.width / 2, holdCanvas.width / 2, 2.5, 0, 2 * Math.PI, false);
                holdCanvasctx.fillStyle = 'rgba(255,255,255,.8)';
                holdCanvasctx.strokeStyle = 'rgba(0,0,0,.5)';
                holdCanvasctx.lineWidth = 2;
                holdCanvasctx.fill();
                holdCanvasctx.stroke();


                let x = Number( this.boardCols.indexOf( holds.toString()[0] ) );
                let y = Number(holds.replace(/\D/g,'') -1 );

            // copy and draw the hold to the main canvas
            this.ctx.drawImage(holdCanvas, x * this.holdSize * dpr, y * this.holdSize * dpr);

            this.setupCanvas.style.top = `${this.cellSize / 2}px`;
            this.setupCanvas.style.left = `${this.cellSize / 2}px`;
            }
        }
/**
 * Get hold setup
 */

        this.loadBoardSetup = (fromGlobals) => {
            this.boardContainerWrapper.innerHTML = "";
            this.boardContainer.innerHTML = "";
            this.boardContainerWrapper.append(this.boardContainer);
            this.boardCols = 'abcdefghijklmnopqrstuvwxyz';

// Get setup from firebase
            ( async () => {
				const docRef = doc(this.db, "boardSetup", globals.board);
				const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().boardSetup ) {

                    this.drawHolds(fromGlobals ? fromGlobals : docSnap.data().boardSetup);
                } else {
                    // fetch hold setup
                    fetch(`/hold_setup.json?doUpdate=${new Date().getTime()}`)
                    .then(response => response.json())
                    .then(data => {
                        if(fromGlobals) data = fromGlobals;
                        this.drawHolds(data);
                    })
                }
            })();

            if(globals.selectedRouteId) {
                this.loadRoute(globals.selectedRouteId)
            }
        }

/**
 * Update route (show selected holds)
 */
        this.updateRoute = ( holdSetup ) =>  {
            for ( let hold in holdSetup ) {
                this.boardContainer.querySelector(`#${hold}`).classList.add(`selected`, `${holdSetup[hold]}`)
                }
        }

/**
 * Load route from firebase
 */
        this.loadRoute = ( routeId ) => {
            this.clearRoute();
            ( async () => {
                const docRef = doc(this.db, "routes", routeId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    let routeData = docSnap.data();
                    let holdSetup = routeData.holdSetup;

                    globals.selectedRoute = routeData['name'];
                    globals.selectedRouteId = routeId;

                    for ( let hold in holdSetup ) {
                        this.boardContainer.querySelector(`#${hold}`).classList.add(`selected`, `${holdSetup[hold]}`)
                        }

                    this.updateBoard( { routeId : routeId, routeData: null } );

                    }
                else {
                    // doc.data() will be undefined in this case
                    console.log("No such document!");
                }
            })();
        }

/**
 * Get list of routes
 */
        this.list = () => {
            // get routes from DB

            const dbQuery = query(collection(getFirestore(), 'routes'));
            onSnapshot(dbQuery, (querySnapshot) => {
            const routes = [];
			querySnapshot.forEach((doc) => {
				let routeData = doc.data();
				if(routeData.napakboard === globals.board) {
					routeData.id = doc.id;
					routes.push(routeData);
				}
			});

            globals.boardRoutes = routes.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
            globals.sortedRoutes = globals.boardRoutes;
            });


            let selectedRoute = null;
            delete globals.routeNameSearch;
            let listDialog = dce({el:'div'});
            let sortOptionsContainer = dce({el: 'form', cssClass: 'routefilters', cssStyle: 'z-index: 2; margin-left: -20px; margin-right: -20px; padding: 10px 20px; background: rgb(32,32,32)', attrbs: [["name", "routesort"]]});
            sortOptionsContainer.onsubmit = (e) => {
                e.preventDefault();
                return;
            }

            // Name
            let name = new dsInput({
                attrbs: [
                    ['placeholder', 'Route name'],
                    ['name', 'routename'],
                    ['value', ''],
                    ['style', 'margin: 0'],
                    ['value', globals.routeNameSearch || '']
                ],
                onkeyup: (e) => {
                    if(e.target) {
                        globals.routeNameSearch = e.target.value;
                    }
                    }
            });

            let routeNameContainer = dce({el: 'div', cssStyle: 'display: flex; margin: 10px 0;  justify-content: space-between; align-items: center;'})
            routeNameContainer.append(
                dce({el: 'h3', content: 'Route Name', cssStyle: 'text-align: center; color: #aaa; font-weight: 300'}),
                name
            );

            sortOptionsContainer.append(routeNameContainer, document.createElement("hr") );

            let angles = Array();
            for(let i=0, j=80; i<=j; i+=5) {
                angles.push([`${i}`, i, i === Number(globals.boardAngle)]);
            }

            let angle = new dsSelect({
                options: angles,
                change: (e) => {
                    globals.boardAngle = Number(e);
                    },
                cssStyle: 'padding: 0; margin: 0;'
            });

            let routeAnglContainer = dce({el: 'div', cssStyle: 'display: flex; margin: 10px 0;  justify-content: space-between; align-items: center;'})
            routeAnglContainer.append(
                dce({el: 'h3', content: 'Angle', cssStyle: 'text-align: center; color: #aaa; font-weight: 300'}),
                angle
            );

            if(globals.boardSetup.characteristics.adjustable) {
                sortOptionsContainer.append(routeAnglContainer, document.createElement("hr") );
            }

            // Sort by
            let sortMenu = new dsRadio({
                cssClass: 'radio-menu',
                title: 'Sort by',
                name: 'sort',
                options: [
                    {
                        title: "name",
                        value: "name",
                        checked: globals.routeSorting === 'name' ? true : false
                    },
                    {
                        title: "grade",
                        value: "grade",
                        checked: globals.routeSorting === 'grade' ? true : false
                    },
                    {
                        title: "date",
                        value: "date",
                        checked: globals.routeSorting === 'date' ? true : false
                    }
                ],
                onchange: () => { globals.routeSorting = document.forms['routesort'].sort.value }
            });

            let sortByContainer = dce({el: 'div', cssStyle: 'display: flex; margin: 10px 0; justify-content: space-between; align-items: center;'})
            sortByContainer.append(
                dce({el: 'h3', content: 'Sort by', cssStyle: 'text-align: center; color: #aaa; font-weight: 300'}),
                sortMenu
            );

            sortOptionsContainer.append( sortByContainer, document.createElement("hr") );

            // order
            let order = new dsRadio({
                cssClass: 'radio-menu',
                title: 'Order',
                name: 'order',
                options: [
                    {
                        title: "ascending",
                        value: "asc",
                        checked: globals.sortOrder === 'asc' ? true : false
                    },
                    {
                        title: "descending",
                        value: "desc",
                        checked: globals.sortOrder === 'desc' ? true : false
                    }
                ],
                onchange: () => {
                    globals.sortOrder = document.forms['routesort'].order.value;
                    updateRouteListSorting();
                }
            });


            let orderContainer = dce({el: 'div', cssStyle: 'display: flex; margin: 10px 0; justify-content: space-between; align-items: center;'})
            orderContainer.append(
                dce({el: 'h3', content: 'Order', cssStyle: 'text-align: center; color: #aaa; font-weight: 300'}),
                order);


            sortOptionsContainer.append(orderContainer, document.createElement("hr") );

            // My ticks
            let toggleMyAscents = new dsToggle({
                cssClass  : 'horizontal-menu justify-center full-width',
                targetObj : 'excludeTicks',
                options   : [
                {title: 'Include', value: false, selected: globals.excludeTicks === false},
                {title: 'Exclude', value: true, selected: globals.excludeTicks === true}],
                onToggle : () => { updateRouteListSorting() },
            });

            let myTicksContainer = dce({el: 'div', cssStyle: 'display: flex; margin: 10px 0; justify-content: space-between; align-items: center;'})
            myTicksContainer.append(
                dce({el: 'h3', content: 'My ticks', cssStyle: 'text-align: center; margin: 0 0 10px 0; color: #aaa; font-weight: 300'}),
                toggleMyAscents.render()
            );

            sortOptionsContainer.append(myTicksContainer );

            let routeCountContainer = dce({el: 'h3', cssStyle: 'text-align: center; padding: 10px 0;', content: `Showing ${globals.sortedRoutes.length} routes`});

            let showFiltersContainer = dce({el: 'DIV', cssClass: 'show-filters-container'});
            let showFilters = dce({el: 'BUTTON', cssClass: 'btn btn_small preferred show-filters mt mb', content: 'Show filters'});

            showFilters.addEventListener('click', () => {
                globals.clickDelay = true;
                sortOptionsContainer.classList.toggle('sticky')
                setTimeout(()=>{globals.clickDelay = false}, 300);
            }, false);

            // get the sticky element
            const observer = new IntersectionObserver(
                ([e]) => e.target.classList.toggle('isSticky', e.intersectionRatio < 1),
                {threshold: [1]}
            );

            observer.observe(showFiltersContainer)

            showFiltersContainer.append(showFilters);

            listDialog.append(sortOptionsContainer, routeCountContainer, showFiltersContainer);
            listDialog.append(dce({el: 'div', cssClass: 'loading', content: 'Loading routes...'}));


            const updateRouteList = ( ) => {
                let loader = listDialog.querySelector('.loading');
                if(loader && loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }

                let routelistContainer = dce({el: 'div', cssClass : 'route-list-container'});

                let routes = globals.boardRoutes;
                globals.sortedRoutes = [];
                if(globals.routeSorting === 'name')  { routes = globals.boardRoutes.sort((a, b) => a.name.localeCompare(b.name)) }
                if(globals.routeSorting === 'grade') { routes = globals.boardRoutes.sort((a,b) => a.grade - b.grade) }
                if(globals.routeSorting === 'date')  { routes = globals.boardRoutes.sort((a,b) => (a.added > b.added) ? 1 : ((b.added > a.added) ? -1 : 0)) }

                if(globals.sortOrder === 'desc')  { routes.reverse() }

                // search by name
                const searchString = globals.routeNameSearch || null;
                if(searchString) { routes = globals.boardRoutes.filter( (route) => route.name.toLowerCase().indexOf(searchString.toLowerCase()) !== -1)}

                // angle
                if(globals.boardSetup.characteristics.adjustable) {
                    if(globals.boardAngle !== 0) {
                        routes = routes.filter( (route) => route.angle === globals.boardAngle);
                    }
                }

                // Hide archived routes
                routes.forEach((routeData) => {
					let isAdmin = getAuth().currentUser ? getAuth().currentUser.uid === globals.boardSetup.owner : false;

                    // exclude user ticks (if selected)
                    if( globals.excludeTicks && routeData.ticks && routeData.ticks.includes(getAuth().currentUser.uid) ||
                        routeData.archived
                        ) {}
                    else{
                        // doc.data() is never undefined for query doc snapshots
                        let routeItem = dce({el: 'DIV', cssClass: 'route-list-item'});
                        if( globals.selectedRouteId === routeData.id ) { routeItem.classList.add('selected'); }
                        if( routeData.ticks && routeData.ticks.includes(getAuth().currentUser.uid) ) { routeItem.classList.add('climbed'); }
                        let routeName = dce({el: 'h3', content: routeData.name});
                        let routeDetails = dce({el: 'div'});
                        let routeGrade = new dsLegend({title: globals.grades.font[routeData.grade], type: 'grade', cssClass: globals.difficulty[routeData.grade]})
                        let routeMirror = new dsLegend({title: 'MIRROR', type: 'routeType', cssClass: 'mirror'})

                        let routeAdded = dce({el: 'div', content: handleDate({dateString: new Date(routeData.added.toDate())})});
                        let routeSetter = dce({el: 'div', content: `by ${routeData.setter}`});
                        let routeRepeats = dce({el: 'div', content: (routeData.ticks ? `- ${routeData.ticks.length} repeat${routeData.ticks.length > 1 ? 's' : ''}` : null)});
                        routeDetails.append(routeGrade, ((routeData.mirror) ? routeMirror : ''), routeAdded, routeSetter, routeRepeats);
                        routeItem.append(routeName, routeDetails);
                        routeItem.addEventListener('click', () => {
                            let toggleSelected = listDialog.querySelectorAll('.selected');
                            toggleSelected.forEach( ( el) => {el.classList.remove('selected')});
                            routeItem.classList.add('selected');
                            selectedRoute = routeData.id;
                        }, false);
						if(isAdmin) {
							let adminContainter = dce({el: 'DIV', cssStyle: 'position: relative'})
							let removeButton = new dsButton({
								title: 'Archive',
								cssClass: 'btn btn_tiny',
								cssStyle: 'position: absolute; top: 10px; right: 10px;',
								thisOnClick: () => {
									console.log(routeData.id)
									const routeReg = doc(this.db, "routes", routeData.id);
									updateDoc(routeReg, { 'archived': true}, {merge: true});
									alert(`Route ${routeData.id} archived`);
								}
							});
							adminContainter.append(routeItem, removeButton);
							routelistContainer.append(adminContainter);
						}
						else {
						routelistContainer.appendChild(routeItem);
						}

                        globals.sortedRoutes.push(routeData)
                    }
                });

                if(listDialog.querySelector('.route-list-container')) {
                    let clearList = listDialog.querySelector('.route-list-container');
                    clearList.parentNode.removeChild(clearList);
                }
                listDialog.append(routelistContainer);
                routeCountContainer.innerHTML = `Showing ${globals.sortedRoutes.length} routes`;

            }

// Sorting options
            const updateRouteListSorting = ( ) => {
                if(globals.routeSorting === 'name')  { globals.boardRoutes = globals.boardRoutes.sort((a, b) => a.name.localeCompare(b.name)) }
                if(globals.routeSorting === 'grade') { globals.boardRoutes = globals.boardRoutes.sort((a,b) => a.grade - b.grade) }
                if(globals.routeSorting === 'date')  { globals.boardRoutes = globals.boardRoutes.sort((a,b) => (a.added > b.added) ? 1 : ((b.added > a.added) ? -1 : 0)) }
                if(globals.routeSorting === 'grade') { globals.boardRoutes = globals.boardRoutes.sort((a,b) => a.grade - b.grade) }
            }

            storeObserver.add({
                store: globals,
                key: 'boardRoutes',
                id: 'systemBoardRoutesUpdate',
                callback: () => {updateRouteList()}
            });

            storeObserver.add({
                store: globals,
                key: 'routeNameSearch',
                id: 'systemBoardNameSearchUpdate',
                callback: () => {updateRouteList()}
            });

            storeObserver.add({
                store: globals,
                key: 'boardAngle',
                id: 'systemBoardAngleUpdate',
                callback: () => {
                    updateRouteList()
                }
            });


            // Sort listener
            storeObserver.add({
                store: globals,
                key: 'routeSorting',
                id: 'sortRoutesBy',
                callback: () => {updateRouteListSorting()}
            });


            let mother = document.querySelector('.app');
            let modalWindow = new dsModal({
                title: 'Route list',
                content: listDialog,
                onscroll: (e) => {
                    if(!globals.clickDelay) {
                        e.target.querySelector('form').classList.remove('sticky');
                    }
                },
                options: [{
                    cancel: new dsButton({
                        title: 'Cancel',
                        cssClass: 'btn btn_small',
                        thisOnClick: () => {
                            globals.sortedRoutes = [];
                            modalWindow.close();
                        }
                    }),
                    load: new dsButton({
                        title: 'Load',
                        cssClass: 'btn btn_small preferred',
                        thisOnClick: () => {
                            if(selectedRoute) {
                                this.loadRoute(selectedRoute)
                            }
                            modalWindow.close()
                        }
                    })
                }],
            });
            mother.append(modalWindow)
        }

        this.next = () => {}

/**
 * Clear route modal
 */
        this.clear = () => {
            let clearDialog = dce({el:'div'});
            let confirm = dce({el: 'p', content: 'Confirm route clear'});
            clearDialog.append(confirm);

            let mother = document.querySelector('.app');
            let modalWindow = new dsModal({
                title: 'Clear route',
                content: clearDialog,
                options: [{
                    cancel: new dsButton({
                        title: 'Cancel',
                        cssClass: 'btn btn_small',
                        thisOnClick: () => { modalWindow.close() }
                    }),
                    confirm: new dsButton({
                        title: 'Confirm',
                        cssClass: 'btn btn_small preferred',
                        thisOnClick: () => {
                            globals.selectedRoute = null;
                            globals.selectedRouteId = null;
                            // only update for authenticated users
                            this.clearRoute();
                            this.updateBoard({routeData: null});

                            modalWindow.close()
                        }
                    })
                }],
            });
            mother.append(modalWindow)
        }

/**
 * Clear selected holds
 */
        this.clearRoute = ( ) => {
            let selected = this.boardContainer.querySelectorAll('.selected');
            selected.forEach((el) => {el.classList.remove('selected', 'top', 'start', 'intermediate', 'foot')});
        }

// Save modal
        this.save = ( params ) => {
            let saveDialog = dce({el:'FORM', cssStyle: 'padding: 10px 0'});

           const names = [["Funky", "Stinky", "Dusty", "Spicy", "Slippery", "Gnarly", "Chunky", "Gritty", "Wobbly", "Crispy", "Spooky", "Feisty", "Sticky", "Groovy", "Rowdy", "Wild", "Sketchy", "Crunchy", "Pumpy", "Greasy"],
                ["crimp", "sloper", "jug", "pinch", "heelhook", "toe", "finger", "forearms", "feet", "elbows", "dyno", "hangboard", "mantle", "arete", "pocket", "ledge", "volume", "crux", "beta", "campus", "ass"],
                [ "fest", "party", "mayhem", "madness", "parade", "circus", "riot", "fiesta", "meltdown", "jam", "explosion", "showdown", "shuffle", "brawl", "derby", "hustle", "grind", "saga", "odyssey", "storm", "fuck", "shit"]
            ];

            let randomName = () => {
                let name = "";
                for (let i = 0; i < names.length; i++) {
                    const partList = names[i];
                    const part = partList[Math.floor(Math.random() * partList.length)];
                    name += `${part} `;
                }
                return name;
            };

            let routeNameContainer = dce({el:'div', cssStyle: 'display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: var(--padding-base)'});

            let routeName = new dsInput({
                label: 'Route name',
                attrbs: [
                    ['placeholder', ''],
                    ['name', 'routename']
                ],
                cssStyle: 'width: 100%;'
                });

            let randomize = new dsButton({
                title: 'Randomize',
                cssClass: 'btn btn_small',
                cssStyle: 'margin: 0 0 var(--padding-base) var(--padding-base);'
            });

            randomize.addEventListener('click', (e)=>{
                e.preventDefault();
				 document.querySelector('input[name="routename"]').value = randomName();
            }, false)

            let setter = new dsInput({label: 'Route setter', attrbs: [
                ['placeholder', ''],
                ['name', 'routesetter'],
                ['value', getAuth().currentUser.displayName || 'Anonymous']
            ]});

            let setterid = new dsInput({attrbs: [
                ['name', 'setterid'],
                ['value', getAuth().currentUser.uid],
                ['hidden', true]
            ]});

            /** angle  */
            let angles = Array();
            for(let i=0, j=80; i<=j; i+=5) {
                angles.push([`${i}`, i, i === Number(globals.boardAngle)]);
            }

            let angle = new dsSelect({
                label: 'Route angle',
                options: angles,
                change: (e) => {
                    globals.boardAngle = Number(e);
                    },
                cssStyle: 'padding: 0; margin: 0;'
            });

            let gradeOptions = Array();
            for(let i=0, j=globals.grades.font.length; i<j; i++) {
                gradeOptions.push([globals.grades.font[i], i]);
            }

            let grade = new dsSelect({label: 'Grade', options: gradeOptions})

            routeNameContainer.append(routeName, randomize);
            saveDialog.append(routeNameContainer, grade, setter, setterid);
            if(globals.boardSetup.characteristics.adjustable) {
                saveDialog.append(angle);
            }

            let mother = document.querySelector('.app');
            let modalWindow = new dsModal({
                title: 'Add new route',
                content: saveDialog,
                options: [{
                    cancel: new dsButton({
                        title: 'Cancel',
                        cssClass: 'btn btn_small',
                        thisOnClick: () => { modalWindow.close() }
                    }),
                    save: new dsButton({
                        title: 'Save',
                        cssClass: 'btn btn_small preferred',
                        thisOnClick: () => {
                            this.validateAndSave({
                                routeName: document.querySelector('input[name="routename"]').value,
                                setter: setter.value,
                                setterID: setterid.value,
                                grade: grade.value,
                                angle: globals.boardSetup.characteristics.adjustable ? Number(angle.value) : null,
                                callBack: () => { modalWindow.close() }
                            })
                        }
                    })
                }],
            });

            mother.append(modalWindow)
        }

/**
 * Validate save form and store into firebase
 */
        this.validateAndSave = ( params ) => {
            let selected = this.boardContainer.querySelectorAll('.selected');
			let hasStart = this.boardContainer.querySelectorAll('.selected.start');
			let hasEnd = this.boardContainer.querySelectorAll('.selected.top');


            let holdSetup = {};
			let mirrorCalc = 1;
            selected.forEach( (hold) => {
				if( !hold.classList.contains('mirrored') ) {
					mirrorCalc = -1;
				}
                let holdType = 'intermediate';
                if(hold.classList.contains('top')) {holdType = 'top'}
                if(hold.classList.contains('start')) {holdType = 'start'}
                if(hold.classList.contains('foot')) {holdType = 'foot'}
                holdSetup[hold.id] = holdType;
            });

            let routeReady = true;

            if(params.routeName === "" || params.setter === "") {
                alert('Route name or setter name missing');
                routeReady = false;
            }

            if(selected.length <= 0) {
                alert('no holds?');
                routeReady = false;
            }

			if(hasStart.length <= 0 || hasEnd.length <= 0) {
                alert('Missing start or top hold(s)');
                routeReady = false;
            }

            if(routeReady) {
                ( async () => {
                    const newRoute = await addDoc(collection(this.db, "routes"), {
                        "added": new Date(),
                        "name": `${params.routeName}`,
                        "grade": params.grade,
                        "setter": `${params.setter}`,
                        "setterID": params.setterID,
                        "holdSetup": holdSetup,
						"napakboard": globals.board,
                        "angle": Number(params.angle),
						"mirror": mirrorCalc === 1 ? true : false,
                    });

										/** Create mirror route automagically */
					if(mirrorCalc === 1) {
						const holdSetupMirror = {};
						for( let hold in holdSetup ) {
							let colId = hold.toString().replace(/[0-9]/g, '');
							let colNbr = hold.toString().replace(/\D/g,'');

							let mirroredHold = `${globals.boardSetup.mirrorCols[colId]}${colNbr}`;
							holdSetupMirror[mirroredHold] = holdSetup[hold];
						}

					const newRoute = await addDoc(collection(this.db, "routes"), {
                        "added": new Date(),
                        "name": `${params.routeName} (M)`,
                        "grade": params.grade,
                        "setter": `${params.setter}`,
                        "setterID": params.setterID,
                        "holdSetup": holdSetupMirror,
						"napakboard": globals.board,
                        "angle": Number(params.angle),
						"mirror": mirrorCalc === 1 ? true : false,
                    });
					}

                    if( params.callBack ) {
                        params.callBack()
                        globals.selectedRouteId = newRoute.id;
                        this.loadRoute(globals.selectedRouteId)
                    }
                })();
            }
        }

        this.tick = ( ) => {
            let mother = document.querySelector('.app');

            // check if user has already climbed selected route
            let routeTicks = globals.boardRoutes.find(({ id }) => id === globals.selectedRouteId);
            if(!routeTicks) { return; }
            let climbed = routeTicks.ticks && routeTicks.ticks.includes(getAuth().currentUser.uid);

            let tickDialog = dce({el:'div', cssStyle: 'padding: 10px 0 20px; text-align: center'});
            let confirm = dce({el: 'p', content: climbed ? 'You have already ticked this route. Want to remove it?' : ''});
            tickDialog.append(confirm);

            if(!climbed) {
                let routeTickForm = dce({el: 'FORM', attrbs: [['name', 'tick-form']]});

                let tickType = new dsRadio({
                    cssClass: 'radio-menu',
                    title: 'Tick type',
                    name: 'tick',
                    options: [
                        {
                            title: "flash",
                            value: "flash",
                            checked: true
                        },
                        {
                            title: "redpoint",
                            value: "redpoint"
                        }
                    ]});

                routeTickForm.append(tickType);
                tickDialog.appendChild(routeTickForm);

            }

            let modalWindow = new dsModal({
                title: 'Tick route',
                content: tickDialog,
                options: [{
                    cancel: new dsButton({
                        title: 'Cancel',
                        cssClass: 'btn btn_small',
                        thisOnClick: () => { modalWindow.close() }
                    }),
                    tick: new dsButton({
                        title: climbed ? 'Remove tick' : 'Tick',
                        cssClass: 'btn btn_small preferred',
                        thisOnClick: () => {
                            if(globals.selectedRouteId) {

                                // remove tick
                                if ( climbed ) {
                                    ( async () => {
                                        const routeReg = doc(this.db, "routes", globals.selectedRouteId);
                                        updateDoc(routeReg, { 'ticks': arrayRemove(getAuth().currentUser.uid)}, {merge: true});
                                    })();
                                    ( async () => {
                                        const userRef = doc(this.db, "users", getAuth().currentUser.uid);
                                        const docSnap = await getDoc(userRef);

                                        let ticks = docSnap.data().ticks.filter(route => route.routeId != globals.selectedRouteId);
                                        updateDoc(userRef, { 'ticks': ticks}, {merge: true});
                                    })();

                                    globals.standardMessage.push({message : `Tick removed`, timeout: 1});
                                    globals.standardMessage = globals.standardMessage;
                                }

                                // Add tick
                                else {
                                    ( async () => {
                                        const routeReg = doc(this.db, "routes", globals.selectedRouteId);
                                        updateDoc(routeReg, { 'ticks': arrayUnion(getAuth().currentUser.uid)}, {merge: true});
                                    })();
                                    ( async () => {
                                        const userRef = doc(this.db, "users", getAuth().currentUser.uid);
                                        updateDoc(userRef, { 'ticks': arrayUnion(
                                            {
                                                'routeId': globals.selectedRouteId,
                                                'type': document.forms['tick-form'].tick.value,
                                                'date': new Date().getTime(),
                                            })}, {merge: true});
                                    })();

                                    globals.standardMessage.push({message : `${globals.selectedRoute} ticked`, timeout: 1});
                                    globals.standardMessage = globals.standardMessage;
                                }
                            }
                            modalWindow.close()
                        }
                    })
                }],
            });
            mother.append(modalWindow)
        }

        this.updateBoard = ( ) => {
            if( globals.lightsOn ) {
                let selected = this.boardContainer.querySelectorAll('.selected');
                let holdSetup = {};
                selected.forEach( (hold) => {
                    let holdType = 'intermediate';
                    if(hold.classList.contains('top')) {holdType = 'top'}
                    if(hold.classList.contains('start')) {holdType = 'start'}
                    if(hold.classList.contains('foot')) {holdType = 'foot'}
                    holdSetup[hold.id] = holdType;
                });

                (async () => {
                    const routeRef = doc(this.db, "current", `currentRoute_${globals.board}`);

                    await setDoc( routeRef, {
                        routeData: {holdSetup: holdSetup},
                        routeName: globals.selectedRoute || 'Unsaved route',
                        routeId: globals.selectedRouteId || 'No id',
						boardId: globals.board
                    });
                })();
            }
        }

        storeObserver.add({
            store: globals,
            key: 'lightsOn',
            id: 'lightsToggle',
            callback: this.updateBoard
        });


        this.render = () => {
            return this.boardContainerWrapper;
        }

    }
}

export default systemBoard;
