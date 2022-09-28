import { dce } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import { handleDate } from '../../shared/date.js';
import dsModal  from '../../components/ds-modal/index.js';
import dsButton from '../../components/ds-button/index.js';

class systemBoard {
    constructor( params ) {
        this.boardData = params;
    
        this.boardContainer = dce({el: 'div', cssClass:'board-container' })

        let boardCols = 'abcdefghijklmnopqrstuvwxyz';    
        let boardWidth = params.width;
        let boardHeight = params.height;
    
        this.db = firebase.firestore();

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
                            this.updateLeds(true);
                        }, false)
                    }
                }
                this.boardContainer.appendChild(gridCell);
            }
            gridTemplateAreas+= `"${gridRowAreas.join(' ')}"`;
        }
        sheet.insertRule(`.board-container {grid-template-areas: ${gridTemplateAreas}}`);

        this.getHoldSetup = () => {
             // fetch hold setup
            fetch(`/projects/napakboard/hold_setup.json`)
            .then(response => response.json())
            .then(data => {
                for( let holds in data) {
                    let parent = document.querySelector(`#${holds}`);
                    parent.style.color = data[holds].holdColor ? data[holds].holdColor : 'transparent';
                    let holdContainer = document.createElement("DIV");
                    holdContainer.className = "hold";

                    let holdImage = `/projects/napakboard/images/holds/${data[holds].holdImage ? data[holds].holdImage : 'placeholder.svg'}`;
                    parent.append(holdContainer)
                    fetch(holdImage)
                        .then(response => response.text())
                        .then(svg => {
                            holdContainer.insertAdjacentHTML("afterbegin", svg);
                        });

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

            let self = this;
            // Get current state from firestore
            this.db.collection('current').onSnapshot(function(querySnapshot) {
                querySnapshot.forEach(function(doc) {
                    let queryData = doc.data();
                    let routeId = queryData.routeId;
                    let routeData = queryData.routeData;

                    let doUpdate = false;
                    // If route is selected - load it 
                    if(routeId) {
                        console.log('here') 
                        self.loadRoute(routeId, false)
                    }

                    // If holds are selected - show selected 
                    if(routeData) {
                        self.clearRoute();
                        for ( let hold in routeData.holdSetup ) {
                            self.boardContainer.querySelector(`#${hold}`).classList.add(`selected`, `${routeData.holdSetup[hold]}`)   
                            }
                    }
                    if(!routeId && !routeData) {
                        doUpdate = true;
                    }
                    self.updateLeds(doUpdate);
                });
            });
        }

        // Update leds and firebase
        this.updateLeds = ( updateDb ) => {
            let selected = this.boardContainer.querySelectorAll('.selected'); 

            let holdSetup = {};
            selected.forEach( (hold) => {
                let holdType = 'intermediate';
                if(hold.classList.contains('top')) {holdType = 'top'}
                if(hold.classList.contains('start')) {holdType = 'start'}
                holdSetup[hold.id] = holdType;
            });

            if(updateDb) {
                const routeData = {holdSetup : holdSetup}
                // Update currentRoute to firestore - server will read this and update leds
                this.db.collection("current").doc("currentRoute").update({routeId : false, routeData: routeData})
                .then(() => {})
                .catch((error) => {
                });
            }
        }

        this.loadRoute = ( routeId, updateDb ) => {
            this.db.collection("routes").doc(routeId).get().then((doc) => {
                if (doc.exists) {
                    this.clearRoute(true);

                    let routeData = doc.data();
                    let holdSetup = routeData.holdSetup;

                    globals.selectedRoute = routeData['name'];

                    if(updateDb) {
                        // Update currentRoute to firestore - server will read this and update leds
                        this.db.collection("current").doc("currentRoute").update({routeId : routeId})
                        .then(() => {})
                        .catch((error) => {});
                    }
        
                    for ( let hold in holdSetup ) {
                        this.boardContainer.querySelector(`#${hold}`).classList.add(`selected`, `${holdSetup[hold]}`)   
                        }
                    }
                else {
                    console.log('not found')
                }
            });
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
                                this.loadRoute(selectedRoute, true)
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
                            this.clearRoute(true);
                            modalWindow.close()
                        }
                    })
                }],
            });
            mother.append(modalWindow)
        }

        this.clearRoute = ( dbClear ) => {
            let selected = this.boardContainer.querySelectorAll('.selected'); 
            let start = this.boardContainer.querySelectorAll('.start'); 
            let intermediate = this.boardContainer.querySelectorAll('.intermediate'); 
            let top = this.boardContainer.querySelectorAll('.top'); 
            this.clearClassNames(selected, 'selected');
            this.clearClassNames(top, 'top');
            this.clearClassNames(start, 'start');
            this.clearClassNames(intermediate, 'intermediate');

            if(dbClear) {
                // clear db
                this.db.collection("current").doc("currentRoute").update({routeId : false, routeData: false})
            }
            globals.selectedRoute = null;
            this.updateLeds();
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
                this.db.collection("routes").add({
                    "added": new Date(),
                    "name": `${params.routeName}`,
                    "grade": params.grade,
                    "setter": `${params.setter}`,
                    "holdSetup": holdSetup
                })
                .then((docRef) => {
                    console.log("Document written with ID: ", docRef.id);
                    alert('Route saved!')
                    if( params.callBack ) { params.callBack() }
    
                })
                .catch((error) => {
                    console.error("Error adding document: ", error);
                    alert('error adding route. Please try again later')
                    this.boardContainer.classList.remove('shadow');
                    modal.parentNode.removeChild(modal);    
                });
            }
        }

        this.render = () => {
            return this.boardContainer;
        }

    }
}

export default systemBoard;
