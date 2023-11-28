import { dce, svg, storeObserver} from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import { handleDate } from '../../shared/date.js';
import dsModal  from '../../components/ds-modal/index.js';
import dsButton from '../../components/ds-button/index.js';
import dsInput from '../../components/ds-input/index.js';
import dsSelect from '../../components/ds-select/index.js';
import dsToggle from '../../components/ds-toggle/index.js';
import dsRadio from '../ds-radio/index.js';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getFirestore, getDoc, onSnapshot, query, updateDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'

import dsLegend from '../ds-legend/index.js';

class systemBoard {
    constructor( params ) {
        this.boardContainerWrapper = dce({el: 'div', cssClass:'board-wrapper' });
        this.boardContainer = dce({el: 'div', cssClass:'board-container kantti' });
        this.holdTypes = ['intermediate', 'foot', 'start', 'top'];

        this.boardContainer.addEventListener('touchstart', (e) => { 
            this.swipeTimer = new Date(); 
            this.swipe = [e.touches[0].clientX, e.touches[0].clientY] 
        }, false);
        this.boardContainer.addEventListener('touchmove', (e) => { this.swipeDiffer = [e.touches[0].clientX, e.touches[0].clientY] }, false);
        this.boardContainer.addEventListener('touchend', (e) => {
            if(document.querySelector('.board-container').scrollWidth > window.innerWidth) return;
            // check swipe travel - exit if null
            if(!this.swipeDiffer[0] && this.swipeDiffer[0] !== 0) { return }
            let doUpdate = false;
            let selectedRouteOrder = globals.selectedRouteId ? globals.boardRoutes.findIndex(route => { return route.id === globals.selectedRouteId; }) : 0;

            if( this.swipeDiffer[0] - this.swipe[0] > 100 ) {
                doUpdate = true;
                selectedRouteOrder -= 1;
                if(selectedRouteOrder < 0) { selectedRouteOrder = globals.boardRoutes.length - 1}
            }
            
            if( this.swipe[0] - this.swipeDiffer[0] > 100 ) { 
                doUpdate = true;
                selectedRouteOrder += 1;
                if(selectedRouteOrder > globals.boardRoutes.length - 1) { selectedRouteOrder = 0}
            }

            if( doUpdate ) {
                this.loadRoute(globals.boardRoutes[selectedRouteOrder].id)
            }
        this.swipeDiffer = [null, null];
        }, false);


        const notify = () => {
            globals.serverMessage.push({message : 'Updating route data', timeout: 1, id : 'tick-sync'});
            globals.serverMessage = globals.serverMessage;
            globals.serverMessage[0].finished = true; 
            globals.serverMessage = globals.serverMessage;
        }

        storeObserver.add({
            store: globals,
            key: 'boardRoutes',
            id: 'routesUpdate',
            callback: notify
          });

        this.db = getFirestore();

/**
 * 
 */
        this.changeBoard = () => {
            this.loadBoardSetup();
        }
/**
 * Get holds
 */
        this.getHoldSetup = () => {
            this.holdImages = svg({el: 'svg', attrbs: [["viewBox","0 0 30 30"]]});

            fetch('/projects/napakboard/images/holds.svg?update=true')
                .then(r => r.text())
                .then(text => {
                    this.holdImages.innerHTML = text;
                    this.loadBoardSetup();
                })
                .catch(console.error.bind(console));
            }

/**
 * Get hold setup
 */

        this.loadBoardSetup = () => {
            this.boardContainerWrapper.innerHTML = "";
            this.boardContainer.innerHTML = "";
            this.boardContainerWrapper.append(this.boardContainer);
            this.boardCols = 'abcdefghijklmnopqrstuvwxyz';
        
            // fetch hold setup
            fetch(`/projects/napakboard/hold_setup_${globals.board}.json?doUpdate=${new Date().getTime}`)
            .then(response => response.json())
            .then(data => {
                
                this.boardHeight = data.characteristics.height;
                this.boardWidth = data.characteristics.width;

                let oldSheet = document.body.querySelector("#napakgrid");
                if(oldSheet) {
                    oldSheet.parentNode.removeChild(oldSheet);
                }
                // create css for board
                let style = document.createElement("style");
                style.id = "napakgrid";
                document.body.appendChild(style);
                let sheet = style.sheet;

                // Generate grid cells
                let gridTemplateAreas = '';
                for(let i=-1, j=this.boardHeight; i<j;i++) {
                    let gridRowAreas = [];
            
                    let gridCell = dce({el: 'div'});
                        gridCell.className = "grid-cell"
            
                    for(let k=-1, l=this.boardWidth; k<l;k++) {
                        let gridCell = dce({el: 'div'})
                        gridCell.className = "grid-cell"
                        if(i<0) {
                            gridRowAreas.push(`header-${k < 0 ? 0  : k+1 }`)
            
                            gridCell.innerHTML = (k >= 0 ) ? this.boardCols[k] : '';
            
                            gridCell.classList.add('row-name', 'row-letter')
                            if ( k < 0 ) {
                                gridCell.classList.add('top-corner')
                            }
                        }
            
                        else{
                            if(k<0) {
                                gridRowAreas.push(`row-order-${i+1}`);
                                gridCell.innerHTML = this.boardHeight - i; //i+1;//
                                gridCell.classList.add('row-name', 'row-number');
            
                            }
                            else {
                                gridRowAreas.push(`grid-cell-${this.boardCols[k]}${i+1}`);
                                gridCell.id = `${this.boardCols[k]}${i+1}`
                                gridCell.addEventListener('click', (e) => {
                                    // prevent adding holds to route
                                    if(globals.selectedRoute !== null) return;
                                    let hold = e.target;

                                    let currentHoldType;
                                    let currentHoldOrder;

                                    if(globals.board == 'Kantti') { this.holdTypes = ['intermediate', 'start', 'top'];}
                                    else { this.holdTypes = ['intermediate', 'foot', 'start', 'top']; }
                            
                               
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
                                            document.querySelector('.status-ticker .current H3').innerText = 'Removed hold from route';        
                                        } 
                                        else {
                                            document.querySelector('.status-ticker .current H3').innerText = `Added - ${this.holdTypes[currentHoldOrder+1]} hold`;        
                                        }
                                    }

                                    else { 
                                        hold.classList.add('selected', this.holdTypes[0]); 
                                        document.querySelector('.status-ticker .current H3').innerText = `Added - ${this.holdTypes[0]} hold`;

                                    }   
                                    this.updateBoard( )
                                }, false)
                            }
                        }
                        this.boardContainer.appendChild(gridCell);
                    }
                    gridTemplateAreas+= `"${gridRowAreas.join(' ')}"`;
                }
                sheet.insertRule(`.board-container {grid-template-columns: repeat(${this.boardWidth+1}, 1fr)}`);
                sheet.insertRule(`.board-container {grid-template-rows: repeat(${this.boardHeight+1}, 1fr)}`);
                sheet.insertRule(`.board-container {aspect-ratio: ${this.boardWidth}/${this.boardHeight}}`);

                /* SETUP CANVAS */
                this.setupCanvas = document.createElement("canvas");
                this.ctx = this.setupCanvas.getContext("2d");

                this.holdSize = 30; // size of SVG viewBox - must be 30 or everything will be fucked
                this.setupCanvas.width = this.holdSize * ( this.boardWidth + 1 ) * window.devicePixelRatio;
                this.setupCanvas.height = this.holdSize * (this.boardHeight + 1 )* window.devicePixelRatio;

                this.setupCanvas.style.width = this.boardContainerWrapper.scrollWidth + "px";

                let margin = document.querySelector(".grid-cell.row-name.row-letter.top-corner").getBoundingClientRect();
                this.setupCanvas.style.top = margin.height+"px";
                this.setupCanvas.style.left = margin.width+"px";
                this.boardContainer.appendChild(this.setupCanvas);

                for( let holds in data.holdSetup) {
                    const { rotation, scale, hold, holdColor, boltPlacement } = data.holdSetup[holds];

                    let holdCanvas = document.createElement("CANVAS")
                    holdCanvas.width = this.holdSize * 2 * window.devicePixelRatio;
                    holdCanvas.height = this.holdSize * 2 * window.devicePixelRatio;

                    let holdCanvasctx = holdCanvas.getContext("2d");
                    let cloneHold = this.holdImages.querySelector(`.${hold || 'placeholder'}`) 
                    if(!this.holdImages.querySelector(`.${hold}`)) {
                        cloneHold = this.holdImages.querySelector('.placeholder');
                    }
                    let newHold = new Path2D(cloneHold.cloneNode(true).getAttribute("d"));
                    
                    let scaleHold  = new Path2D();
                    let scaleX = ( (scale) ? scale[0] : 1 ) * window.devicePixelRatio;
                    let scaleY = ( (scale) ? scale[1] : 1 ) * window.devicePixelRatio;
                    let scalePosX = holdCanvas.width  / 2 - ((this.holdSize * scaleX) / 2) ; 
                    let scalePosY = holdCanvas.height / 2 - ((this.holdSize * scaleY) / 2) ; 

                    let boltOffsetX = boltPlacement ? (this.holdSize / 100) * boltPlacement[0] : 0;
                    let boltOffsetY = boltPlacement ? (this.holdSize / 100) * boltPlacement[1] : 0;

                    scaleHold.addPath(newHold, new DOMMatrix()
                        .translate(scalePosX+boltOffsetX, scalePosY+boltOffsetY)
                        .scale(scaleX, scaleY)
                    );

                    let transformHold = new Path2D();

                    transformHold.addPath(scaleHold, new DOMMatrix()
                        .translate((holdCanvas.width / 2) + boltOffsetX, (holdCanvas.height / 2) + boltOffsetY)       // size
                        .rotate(rotation ? rotation : 0)
                        .translate((-holdCanvas.width / 2) + boltOffsetX, (-holdCanvas.height / 2)+boltOffsetY)   // -1 * size
                    );



                    holdCanvasctx.shadowColor = "rgba(0,0,0,.3)";
                    holdCanvasctx.shadowBlur = this.holdSize / 2;
                    holdCanvasctx.strokeStyle = "rgba(0,0,0,.3)";                      
                    holdCanvasctx.fillStyle = holdColor || 'transparent';
                    holdCanvasctx.fill(transformHold);  

                    holdCanvasctx.stroke(transformHold);
                    holdCanvasctx.restore();

                    let x = Number( this.boardCols.indexOf( holds.toString()[0] ) );
                    let y = holds.replace(/\D/g,'');
                    this.ctx.drawImage(holdCanvas, 
                        ( x - 1 ) * this.holdSize * window.devicePixelRatio + ( this.holdSize / 2 * window.devicePixelRatio), 
                        ( y - 1 ) * this.holdSize * window.devicePixelRatio - ( this.holdSize / 2 * window.devicePixelRatio)
                    );
                }

                for(let x=0, i=this.boardWidth; x<i;x++) {
                    for(let y=0, j=this.boardHeight; y<j;y++) {
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = "rgba(128,128,128,1)";
                        this.ctx.arc(x*this.holdSize*window.devicePixelRatio + (0.5*this.holdSize*window.devicePixelRatio), y*this.holdSize*window.devicePixelRatio  + (0.5*this.holdSize*window.devicePixelRatio), 3, 0, 2 * Math.PI, false);
                        this.ctx.fillStyle = "rgba(255,255,255,.8)";
                        this.ctx.fill()
                        this.ctx.stroke();
                    }
                }
            })

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
            let selectedRoute = null;
            let listDialog = dce({el:'div'});
            let sortOptionsContainer = dce({el: 'form', cssClass: 'sticky', content: 'Sort by:', attrbs: [["name", "routesort"]]});

            let sortMenu = new dsRadio({
                cssClass: 'radio-menu',
                title: 'Tick type', 
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
            
            let boardSelect = new dsRadio({
                cssClass: 'radio-menu',
                title: 'Board', 
                name: 'board',
                options: [
                    {
                        title: "Kantti", 
                        value: "Kantti",
                        checked: globals.board === 'Kantti' ? true : false
                    }, 
                    {
                        title: "PCB",
                        value: "PCB",
                        checked: globals.board === 'PCB' ? true : false
                    }
                ],
                onchange: () => { 
                    globals.selectedRoute = null;
                    globals.selectedRouteId = null;
                    globals.board = document.forms['routesort'].board.value;
                    this.boardContainer.className = `board-container ${globals.board.toLowerCase()}`;
                }
            });


            sortOptionsContainer.append(sortMenu, document.createElement("hr"), document.createTextNode('Select board:'), boardSelect, document.createElement("hr"));
            let toggleMyAscents = new dsToggle({
                cssClass  : 'horizontal-menu full-width',
                targetObj : 'excludeTicks',
                options   : [
                  {title: 'Include', value: false, selected: globals.excludeTicks === false},
                  {title: 'Exclude', value: true, selected: globals.excludeTicks === true}],
                onToggle : () => { updateRouteListSorting() },
              });

            sortOptionsContainer.append(document.createTextNode('My ticks'), toggleMyAscents.render())


            listDialog.append(sortOptionsContainer);

            const updateRouteList = ( ) => {
                let routelistContainer = dce({el: 'div', cssClass : 'route-list-container'});

                let routes = globals.boardRoutes;
                globals.sortedRoutes = [];
                if(globals.routeSorting === 'name')  { routes = globals.boardRoutes.sort((a, b) => a.name.localeCompare(b.name)) }
                if(globals.routeSorting === 'grade') { routes = globals.boardRoutes.sort((a,b) => a.grade - b.grade) }
                if(globals.routeSorting === 'date')  { routes = globals.boardRoutes.sort((a,b) => (a.added > b.added) ? 1 : ((b.added > a.added) ? -1 : 0)) }

                routes.forEach((routeData) => {
                    // exclude user ticks (if selected)
                    if( globals.excludeTicks && routeData.ticks && routeData.ticks.includes(getAuth().currentUser.uid)) {
                    }
                    else{
                        if(routeData.napakboard === globals.board) {
                            // doc.data() is never undefined for query doc snapshots
                            let routeItem = dce({el: 'DIV', cssClass: 'route-list-item'});
                            if( globals.selectedRouteId === routeData.id ) { routeItem.classList.add('selected'); }
                            if( routeData.ticks && routeData.ticks.includes(getAuth().currentUser.uid) ) { routeItem.classList.add('climbed'); }
                            let routeName = dce({el: 'h3', content: routeData.name});
                            let routeDetails = dce({el: 'div'});
                            let routeGrade = new dsLegend({title: globals.grades.font[routeData.grade], type: 'grade', cssClass: globals.difficulty[routeData.grade]})

                            let routeAdded = dce({el: 'div', content: handleDate({dateString: new Date(routeData.added.toDate())})});
                            let routeSetter = dce({el: 'div', content: routeData.setter});
                            routeDetails.append(routeGrade, routeAdded, routeSetter);
                            routeItem.append(routeName, routeDetails);
                            routeItem.addEventListener('click', () => { 
                                let toggleSelected = listDialog.querySelectorAll('.selected');
                                toggleSelected.forEach( ( el) => {el.classList.remove('selected')});
                                routeItem.classList.add('selected'); 
                                selectedRoute = routeData.id;
                            }, false);
                        routelistContainer.appendChild(routeItem);

                        globals.sortedRoutes.push(routeData)
                        }
                    }
                });                
                
                if(listDialog.querySelector('.route-list-container')) {
                    let clearList = listDialog.querySelector('.route-list-container');
                    clearList.parentNode.removeChild(clearList);
                }
                listDialog.append(routelistContainer)
            }

// Sorting options
            const updateRouteListSorting = ( ) => {
                if(globals.routeSorting === 'name')  { globals.boardRoutes = globals.boardRoutes.sort((a, b) => a.name.localeCompare(b.name)) }
                if(globals.routeSorting === 'grade') { globals.boardRoutes = globals.boardRoutes.sort((a,b) => a.grade - b.grade) }
                if(globals.routeSorting === 'date')  { globals.boardRoutes = globals.boardRoutes.sort((a,b) => (a.added > b.added) ? 1 : ((b.added > a.added) ? -1 : 0)) }
            }
            
            storeObserver.add({
                store: globals,
                key: 'boardRoutes',
                id: 'systemBoardRoutesUpdate',
                callback: () => {updateRouteList()}
            });

            storeObserver.add({
                store: globals,
                key: 'board',
                id: 'systemBoardSelect',
                callback: () => {
                    this.changeBoard();
                    updateRouteList();
                }
            });

            // Sort listener
            storeObserver.add({
                store: globals,
                key: 'routeSorting',
                id: 'sortRoutesBy',
                callback: () => {updateRouteListSorting()}
              });

            updateRouteList(); 

            let mother = document.querySelector('.app');
            let modalWindow = new dsModal({
                title: 'Route list',
                content: listDialog,
                options: [{
                    cancel: new dsButton({
                        title: 'Cancel', 
                        cssClass: 'btn btn_small', 
                        thisOnClick: () => { modalWindow.close() }
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
            let saveDialog = dce({el:'FORM'});

            let routeName = new dsInput({label: 'Route name', attrbs: [
                ['placeholder', ''],
                ['name', 'routename']
            ]});

            let setter = new dsInput({label: 'Route setter', attrbs: [
                ['placeholder', ''],
                ['name', 'routesetter'],
                ['value', getAuth().currentUser.displayName || '']
            ]});

            let gradeOptions = Array();
            for(let i=0, j=globals.grades.font.length; i<j; i++) {
                gradeOptions.push([globals.grades.font[i], i]);
            }

            let grade = new dsSelect({label: 'Grade', options: gradeOptions})

            saveDialog.append(routeName, setter, grade);

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
                                routeName: routeName.value, 
                                setter: setter.value, 
                                grade: grade.value,
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

            let holdSetup = {};
            selected.forEach( (hold) => {
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

            if(routeReady) {
                // Add a new document in collection "cities"
                ( async () => {
                    await addDoc(collection(this.db, "routes"), {
                        "added": new Date(),
                        "name": `${params.routeName}`,
                        "grade": params.grade,
                        "setter": `${params.setter}`,
                        "holdSetup": holdSetup,
                        "napakboard": globals.board,                   
                    });
                    alert('Route saved!')
                    if( params.callBack ) { params.callBack() } 
                })();
            }
        }

        this.tick = ( ) => {
            let mother = document.querySelector('.app');

            // check if user has already climbed selected route
            let routeTicks = globals.boardRoutes.find(({ id }) => id === globals.selectedRouteId);
            if(!routeTicks) { return; }
            let climbed = routeTicks.ticks && routeTicks.ticks.includes(getAuth().currentUser.uid);
                        
            let tickDialog = dce({el:'div'});
            let confirm = dce({el: 'p', content: climbed ? 'You have already ticked this route. Want to remove it?' : 'Tick route?'});
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
                                        updateDoc(userRef, { 'ticks': arrayUnion({'routeId': globals.selectedRouteId, 'type': document.forms['tick-form'].tick.value })}, {merge: true});
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
                    await updateDoc( routeRef, {
                        routeData: {holdSetup: holdSetup}, 
                        routeName: globals.selectedRoute || 'Unsaved route',
                        routeId: globals.selectedRouteId || 'No id',
                        boardId: globals.board,
                    } );
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
