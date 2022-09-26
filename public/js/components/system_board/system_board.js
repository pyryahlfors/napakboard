import { dce } from '/js/shared/helpers.js';
import { globals } from '/js/shared/globals.js';

import dsModal  from '/js/components/ds-modal/index.js';
import dsButton from '/js/components/ds-button/index.js';

const controller = new AbortController();
const signal = controller.signal;

class systemBoard {
    constructor( params ) {
        this.boardData = params;
    
        this.boardContainer = dce({el: 'div', cssClass:'board-container' })

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
             // fetch hold setup
            fetch(`hold_setup.json`)
            .then(response => response.json())
            .then(data => {
                for( let holds in data) {
                    let parent = document.querySelector(`#${holds}`);
                    parent.style.color = data[holds].holdColor ? data[holds].holdColor : 'transparent';
                    let holdContainer = document.createElement("DIV");
                    holdContainer.className = "hold";

                    let holdImage = `/images/holds/${data[holds].holdImage ? data[holds].holdImage : 'placeholder.svg'}`;
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
        this.updateLeds();
        }

        this.updateLeds = ( ) => {
            controller.abort();
            let selected = this.boardContainer.querySelectorAll('.selected'); 

            let holdSetup = {};
            selected.forEach( (hold) => {
                let holdType = 'intermediate';
                if(hold.classList.contains('top')) {holdType = 'top'}
                if(hold.classList.contains('start')) {holdType = 'start'}
                holdSetup[hold.id] = holdType;
            });

            const routeData = {holdSetup : holdSetup}

            // LIGHT IT UP!
            fetch( '/', {
                method: 'PUT',
                headers:{ 'Content-Type':'application/json' },
                body:JSON.stringify(routeData)
                }).then(response=>{
                    // console.log(response)
                })
        }

        this.loadRoute = ( routeId ) => {
            const db = firebase.firestore();
            db.collection("routes").doc(routeId).get().then((doc) => {
                if (doc.exists) {

                    let routeData = doc.data();
                    let holdSetup = routeData.holdSetup;

                    this.clearRoute();
                    
                    // LIGHT IT UP!
                    fetch( '/', {
                        method: 'PUT',
                        headers:{ 'Content-Type':'application/json' },
                        body:JSON.stringify(routeData)
                        }).then(response=>{
                            // console.log(response)
                        })
    
    
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
            let selectedRoute = false;
            let listDialog = dce({el:'div'});
            globals.boardRoutes.forEach((routeData) => {
                // doc.data() is never undefined for query doc snapshots
                let routeItem = dce({el: 'DIV', cssClass: 'route-list-item', content: routeData.name});
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
                            this.clearRoute();
                            modalWindow.close()
                        }
                    })
                }],
            });
            mother.append(modalWindow)
        }

        this.clearRoute = () => {
            let selected = this.boardContainer.querySelectorAll('.selected'); 
            let start = this.boardContainer.querySelectorAll('.start'); 
            let intermediate = this.boardContainer.querySelectorAll('.intermediate'); 
            let top = this.boardContainer.querySelectorAll('.top'); 
            this.clearClassNames(selected, 'selected');
            this.clearClassNames(top, 'top');
            this.clearClassNames(start, 'start');
            this.clearClassNames(intermediate, 'intermediate');
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
                const db = firebase.firestore();

                db.collection("routes").add({
                    "added": new Date(),
                    "name": `${params.routeName}`,
                    "grade": params.grade,
                    "setter": `${params.setter}`,
                
                    "holdSetup": holdSetup
                })
                .then((docRef) => {
                    console.log("Document written with ID: ", docRef.id);
                    alert('Route saved!')
                    if(params.callBack) {
                        params.callBack()
                    }
    
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
