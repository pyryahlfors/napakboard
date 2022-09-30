import { dce, svg } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import { handleDate } from '../../shared/date.js';
import dsModal  from '../../components/ds-modal/index.js';
import dsButton from '../../components/ds-button/index.js';
import { getFirestore, getDoc, collection, query, doc, onSnapshot, updateDoc , addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

class systemBoard {
    constructor( params ) {
        this.boardData = params;
    
        this.boardContainer = dce({el: 'div', cssClass:'board-container' })

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
                        self.clearRoute();
                        self.updateRoute(routeData.holdSetup);
                    }
                    
                    else {
                        globals.selectedRoute = null;
                        self.clearRoute();
                    }
                });
            });
        }

        this.updateRoute = ( holdSetup )=>  {
            for ( let hold in holdSetup ) {
                this.boardContainer.querySelector(`#${hold}`).classList.add(`selected`, `${holdSetup[hold]}`)   
                }
        }

        this.updateLeds = ( updateDB ) => {
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

        this.loadRoute = ( routeId ) => {
            ( async () => {
                const docRef = doc(this.db, "routes", routeId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    let routeData = docSnap.data();
                    let holdSetup = routeData.holdSetup;

                    globals.selectedRoute = routeData['name'];
        
                    for ( let hold in holdSetup ) {
                        this.boardContainer.querySelector(`#${hold}`).classList.add(`selected`, `${holdSetup[hold]}`)   
                        }
                    } else {
                    // doc.data() will be undefined in this case
                    console.log("No such document!");
                    }
                })();
            }
        

        this.list = () => {
            let selectedRoute = null;
            let listDialog = dce({el:'div'});
            globals.boardRoutes.forEach((routeData) => {
                // doc.data() is never undefined for query doc snapshots
                let routeItem = dce({el: 'DIV', cssClass: 'route-list-item'});
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
                listDialog.appendChild(routeItem)
            });
            
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
                                    await updateDoc(routeRef, { routeId : selectedRoute, holdSetup: false });
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
                    save: new dsButton({
                        title: 'Confirm', 
                        cssClass: 'btn btn_small preferred', 
                        thisOnClick: () => {
                            globals.selectedRoute = null;

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

        this.clearClassNames = ( elems, cssClass ) => {
            elems.forEach((el) => {el.classList.remove(cssClass)});
        }

        this.save = ( params ) => {
            let saveDialog = dce({el:'FORM'});

            let routeName = dce({el: 'input', attrbs: [['name', 'routename'], ['placeholder', 'Route name']]});
            let setter = dce({el: 'input', attrbs: [['placeholder', 'Setter']]});
            let grade = dce({el: 'select', attrbs: [['placeholder', 'Setter']]});

            for(let i=0, j=globals.grades.font.length; i<j; i++) {
                let option = dce({el: 'option', content: globals.grades.font[i], attrbs: [['value', i]]})
                grade.appendChild(option)
            }

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

        this.validateAndSave = ( params) => {
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

        this.render = () => {
            return this.boardContainer;
        }

    }
}

export default systemBoard;
