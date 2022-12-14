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
        this.boardData = params;
    
        this.boardContainer = dce({el: 'div', cssClass:'board-container' })

        /** 
         * Swipe to next/prev route
         */

        this.swipe = [null,null];
        this.swipeDiffer = [null,null];
        this.swipeTimer =  null;
        this.boardContainer.addEventListener('touchstart', (e) => { 
            this.swipeTimer = new Date(); 
            this.swipe = [e.touches[0].clientX, e.touches[0].clientY] 
        }, false);
        this.boardContainer.addEventListener('touchmove', (e) => { this.swipeDiffer = [e.touches[0].clientX, e.touches[0].clientY] }, false);
        this.boardContainer.addEventListener('touchend', (e) => {
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
        let boardCols = 'abcdefghijklmnopqrstuvwxyz';    
        let boardWidth = params.width;
        let boardHeight = params.height;
    
        // create css for board
        let style = document.createElement("style");    
        document.body.appendChild(style);
        let sheet = style.sheet;
    
        // Generate grid cells
        let gridTemplateAreas = '';
        for(let i=-1, j=boardHeight; i<j;i++) {
            let gridRowAreas = [];
    
            let gridCell = dce({el: 'div'});
                gridCell.className = "grid-cell"
    
            for(let k=-1, l=boardWidth; k<l;k++) {
                let gridCell = dce({el: 'div'})
                gridCell.className = "grid-cell"
                if(i<0) {
                    gridRowAreas.push(`header-${k < 0 ? 0  : k+1 }`)
    
                    gridCell.innerHTML = (k >= 0 ) ? boardCols[k] : '';
    
                    gridCell.classList.add('row-name')
                    gridCell.style['gridArea'] = `header-${k < 0 ? 0  : k+1 }`;
                }
    
                else{
                    if(k<0) {
                        gridRowAreas.push(`row-order-${i+1}`);
                        gridCell.innerHTML = i+1;
                        gridCell.classList.add('row-name');
                        gridCell.style['gridArea'] = `row-order-${i+1}`;
    
                    }
                    else {
                        gridRowAreas.push(`grid-cell-${boardCols[k]}${i+1}`);
                        gridCell.style['gridArea'] = `grid-cell-${boardCols[k]}${i+1}`;
                        gridCell.id = `${boardCols[k]}${i+1}`
                        gridCell.addEventListener('click', (e) => {
                            // prevent adding holds to route
                            if(globals.selectedRoute !== null) return;
                            let hold = e.target;

                            if(hold.classList.contains('selected')) {
                                if(!hold.classList.contains('top') && !hold.classList.contains('start')){
                                    hold.classList.add('start');
                                }
                            else if(hold.classList.contains('start') && !hold.classList.contains('top')) {
                                    hold.classList.remove('start');
                                    hold.classList.add('top')
                                }

                            else if(hold.classList.contains('top') && !hold.classList.contains('start')) {
                                    hold.classList.remove('top', 'selected')
                                }
                            }

                            else { hold.classList.add('selected'); }
                            
                            this.updateBoard( )
                        }, false)
                    }
                }
                this.boardContainer.appendChild(gridCell);
            }
            gridTemplateAreas+= `"${gridRowAreas.join(' ')}"`;
        }
        sheet.insertRule(`.board-container {grid-template-areas: ${gridTemplateAreas}}`);

/**
 * Get hold setup
 */
        this.getHoldSetup = () => {
            this.holdImages = svg({el: 'svg', attrbs: [["viewBox","0 0 30 30"]]});

            fetch('/projects/napakboard/images/holds.svg')
                .then(r => r.text())
                .then(text => {
                    this.holdImages.innerHTML = text;
                    loadHoldSetup();
                })
                .catch(console.error.bind(console));
    
            const loadHoldSetup = () => {
                // fetch hold setup
                fetch(`/projects/napakboard/hold_setup.json?akaaaaaa`)
                .then(response => response.json())
                .then(data => {
                    for( let holds in data) {
                        let parent = document.querySelector(`#${holds}`);
                        parent.style.color = data[holds].holdColor ? data[holds].holdColor : 'transparent';
                        let holdContainer = dce({el: 'div', cssClass: 'hold'});

                        let hold = svg({el: 'svg', attrbs: [['viewBox', '0 0 30 30']]});

                        if(this.holdImages.querySelector(`.${data[holds].hold}`)) {
                            hold.append(this.holdImages.querySelector(`.${data[holds].hold}`).cloneNode(true));
                        }
                        else {
                            hold.append(this.holdImages.querySelector(`.placeholder`).cloneNode(true));
                        }
                        holdContainer.append(hold);
                        parent.append(holdContainer)

                        let holdTransform = "";
                        if( data[holds].rotation ) {
                            holdTransform =  `rotate(${data[holds].rotation}deg) `;
                        }
                        if( data[holds].boltPlacement ) {
                            holdTransform+= `translate3d(${data[holds].boltPlacement[0]}%, ${data[holds].boltPlacement[1]}%, 0)`;
                            holdContainer.style['transformOrigin'] = `${50 + data[holds].boltPlacement[0]}% ${50 + (data[holds].boltPlacement[1] * -1)}%`;
                        }
                        holdContainer.style.transform = holdTransform;
                    }
                })
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
            

            sortOptionsContainer.append(sortMenu);
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

                globals.boardRoutes.forEach((routeData) => {
                    // exclude user ticks (if selected)
                    if( globals.excludeTicks && routeData.ticks && routeData.ticks.includes(getAuth().currentUser.uid)) {
                    }
                    else{
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
            selected.forEach((el) => {el.classList.remove('selected', 'top', 'start', 'intermediate')});
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
                        "holdSetup": holdSetup                   
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
                    holdSetup[hold.id] = holdType;
                });

                (async () => {
                    const routeRef = doc(this.db, "current", "currentRoute");
                    await updateDoc( routeRef, {
                        routeData: {holdSetup: holdSetup}, 
                        routeName: globals.selectedRoute || 'Unsaved route',
                        routeId: globals.selectedRouteId || 'No id'
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


        this.render = () => { return this.boardContainer; }

    }
}

export default systemBoard;
