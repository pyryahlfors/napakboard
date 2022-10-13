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

class systemBoard {
    constructor( params ) {
        this.boardData = params;
    
        this.boardContainer = dce({el: 'div', cssClass:'board-container' })


        globals.boardRoutes = [];
        const dbQuery = query(collection(getFirestore(), 'routes'));
        onSnapshot(dbQuery, (querySnapshot) => {
         const routes = [];
         querySnapshot.forEach((doc) => {
             let routeData = doc.data();
             routeData.id = doc.id;
             routes.push(routeData);
         });

         if(routes.length !== globals.boardRoutes.length) {
          globals.standardMessage.push({message : `Routes updated - ${routes.length} routes found`, timeout: 1, id : 'homepage-routes'});
          globals.standardMessage = globals.standardMessage;
         }

         globals.boardRoutes = routes.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
         });

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

                            else {
                                hold.classList.add('selected');
                            }

                            // update leds and firestore
                            this.updateLeds();
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
                fetch(`/projects/napakboard/hold_setup.json`)
                .then(response => response.json())
                .then(data => {
                    for( let holds in data) {
                        let parent = document.querySelector(`#${holds}`);
                        parent.style.color = data[holds].holdColor ? data[holds].holdColor : 'transparent';
                        let holdContainer = dce({el: 'div', cssClass: 'hold'});

                        let nakki = svg({el: 'svg', attrbs: [['viewBox', '0 0 30 30']]});

                        if(this.holdImages.querySelector(`.${data[holds].hold}`)) {
                            nakki.append(this.holdImages.querySelector(`.${data[holds].hold}`).cloneNode(true));
                        }
                        else {
                            nakki.append(this.holdImages.querySelector(`.placeholder`).cloneNode(true));
                        }
                        holdContainer.append(nakki);
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

/**
 * Listen changes in DB and act
 */
            let self = this;
            const dbQuery = query(collection(this.db, 'current'));
            onSnapshot(dbQuery, (querySnapshot) => {
                const routes = [];
                querySnapshot.forEach((doc) => {
                    let queryData = doc.data();
                    // clear route - do not update DB
                    let routeId = queryData.routeId;
                    let routeData = queryData.routeData;

                    // If route is selected - load it 
                    if(routeId) {
                        self.clearRoute();
                        self.loadRoute(routeId, false)
                    }

                    // If holds are selected - show selected 
                    else if(routeData) {
                        globals.selectedRoute = null;
                        globals.selectedRouteId = null;
                        self.clearRoute();
                        self.updateRoute(routeData.holdSetup);
                    }
                    
                    else {
                        globals.selectedRoute = null;
                        globals.selectedRouteId = null;
                        self.clearRoute();
                    }
                });
            });
        }

/**
 * Update route (show selected holds)
 */
        this.updateRoute = ( holdSetup )=>  {
            for ( let hold in holdSetup ) {
                this.boardContainer.querySelector(`#${hold}`).classList.add(`selected`, `${holdSetup[hold]}`)   
                }
        }

/** 
 * Update firestore to light up the leds
 */
        this.updateLeds = ( ) => {
            let selected = this.boardContainer.querySelectorAll('.selected'); 

            let holdSetup = {};
            selected.forEach( (hold) => {
                let holdType = 'intermediate';
                if(hold.classList.contains('top')) {holdType = 'top'}
                if(hold.classList.contains('start')) {holdType = 'start'}
                holdSetup[hold.id] = holdType;
            });

            const routeData = {holdSetup : holdSetup};
            // Update currentRoute to firestore - server will read this and update leds

            const routeRef = doc(this.db, "current", "currentRoute");
            updateDoc(routeRef, { routeData: routeData });
        }

/**
 * Load route from firebase
 */
        this.loadRoute = ( routeId ) => {
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
                    } else {
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
                        checked: true
                    }, 
                    {
                        title: "grade",
                        value: "grade"
                    },
                    {
                        title: "date",
                        value: "date"
                    }
                ],
                onchange: () => { globals.routeSorting = document.forms['routesort'].sort.value }
            });
            

            sortOptionsContainer.append(sortMenu);
            let toggleMyAscents = new dsToggle({
                cssClass  : 'horizontal-menu full-width',
                targetObj : 'excludeTicks',
                options   : [
                  {title: 'Include', value: false, selected: true},
                  {title: 'Exclude', value: true}],
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
                        let routeGrade = dce({el: 'div', cssClass: `grade-legend ${globals.difficulty[routeData.grade]}`, content: globals.grades.font[routeData.grade]});
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
                                (async () => {
                                    const routeRef = doc(this.db, "current", "currentRoute");
                                    await updateDoc(routeRef, { routeId : selectedRoute, routeData: null });
                                })();
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
                            // only update for authenticated users
                            (async () => {
                                const routeRef = doc(this.db, "current", "currentRoute");
                                await updateDoc(routeRef, { routeId : false, routeData: false });
                            })();

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
            let start = this.boardContainer.querySelectorAll('.start'); 
            let intermediate = this.boardContainer.querySelectorAll('.intermediate'); 
            let top = this.boardContainer.querySelectorAll('.top'); 
            this.clearClassNames(selected, 'selected');
            this.clearClassNames(top, 'top');
            this.clearClassNames(start, 'start');
            this.clearClassNames(intermediate, 'intermediate');
            globals.selectedRoute = null;
        }

// Helper
        this.clearClassNames = ( elems, cssClass ) => {
            elems.forEach((el) => {el.classList.remove(cssClass)});
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
                                routeName: routeName.querySelector('INPUT').value, 
                                setter: setter.querySelector('INPUT').value, 
                                grade: grade.querySelector('SELECT').value,
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

        this.render = () => { return this.boardContainer; }

    }
}

export default systemBoard;
