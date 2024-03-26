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
    constructor( ) {
        this.boardContainerWrapper = dce({el: 'div', cssClass:'board-wrapper'});
        this.boardContainer = dce({el: 'div', cssClass:'board-container kantti' });


		  storeObserver.add({
			store: globals,
			key: 'board',
			id: 'systemBoardSelect',
			callback: () => {
				this.boardContainer.className = `board-container ${globals.board.toLowerCase()}`;
				this.changeBoard();
			}
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
 * update hold setup
 */

		this.updateSetup = (board) => {
			const routeReg = doc(this.db, "boardSetup", globals.board);
			updateDoc(routeReg, { 'boardSetup': globals.boardSetup}, {merge: true});
			alert('setup updated')
		}

		this.drawHolds = ( data ) => {
			globals.boardSetup = data;
			this.boardHeight = data.characteristics.height;
			this.boardWidth = data.characteristics.width;

			let cellSize = 40;

			this.boardContainer.style.height = `${(this.boardHeight + 1) * cellSize}px`;
			this.boardContainer.style.width= `${(this.boardWidth + 1) * cellSize}px`;
			this.boardContainer.className = `board-container ${globals.board.toLowerCase()}`;


			let oldSheet = document.body.querySelector("#napakgrid");
			if(oldSheet) {
				oldSheet.parentNode.removeChild(oldSheet);
			}

			let toprow = dce({el: 'div', cssStyle: `position: sticky; z-index: 2; top: 0; height: ${cellSize}px`});
			let juuh = dce({el: 'div'});
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
							gridCell.innerHTML = this.boardHeight - i; //i+1;//
							gridCell.classList.add('row-name', 'row-number');
						}
						else {
							let tipSpan = document.createElement("span");
							if (i===0) {
								tipSpan.className="tip-below";
							}
							gridCell.append(tipSpan);
							gridCell.id = `${this.boardCols[k]}${i+1}`;
/**
* SETUP MODE
*/

							gridCell.addEventListener('click', (e) => {
								const holdTransform = {};

								const updateBoardJSON = (params) => {
									holdsContainer.querySelector('.selected').querySelector('svg').style.transform = `rotate(${holdTransform?.rotation || 0}deg) translate3d(${holdTransform?.offsetX || 0}%, ${holdTransform?.offsetY || 0}%,0) scaleX(${holdTransform?.scaleX*.01 || 1}) scaleY(${holdTransform?.scaleY*.01 || 1})`;
									holdsContainer.querySelector('.selected').querySelector('svg').fill = holdTransform?.holdColor || '#000';
									globals.boardSetup.holdSetup[params.id] = {...globals.boardSetup.holdSetup[params.id], ...holdTransform}
								}

								const hold = e.target;

								let holdImages = svg({el: 'svg', attrbs: [["viewBox","0 0 30 30"]]});
								let perse = dce({el: 'div'});
								let holdsContainer = dce({el: 'div', cssStyle: 'display: flex; flex-wrap: wrap; justify-content: center' });
								fetch('/projects/napakboard/images/holds.svg?update=true')
								.then(r => r.text())
								.then(text => {
									holdImages.innerHTML = text;

									holdImages.childNodes.forEach((el)=>{
										if(el.tagName === 'path') {
											let holdContainer = dce({el: 'div', cssStyle: 'width: 30px; height: 30;font-size: 0.5em; line-heigth: 1rem; fill: #fff', cssClass: 'setup-hold'});
											holdContainer.style.textAlign = 'center'
											let holdImage = svg({el: 'svg', attrbs: [["viewBox","0 0 30 30"]]});
											holdImage.append(el);

											let holdname = el.dataset.name;

											if(globals.boardSetup.holdSetup[hold.id].hold) {
												if(globals.boardSetup.holdSetup[hold.id].hold === holdname) {
													holdContainer.classList.add('selected')
													holdContainer.style.display = 'block';
												}
												else {
													holdContainer.style.display = 'none';
												}
											}


											holdContainer.addEventListener('click', () => {
												if(holdsContainer.querySelector('.selected')) {
													holdsContainer.childNodes.forEach((child) => {
														child.classList.remove('selected');
														child.style.display = 'block';
													});

												}
												else {
													holdsContainer.childNodes.forEach((child) => {
														child.classList.remove('selected');
														child.style.display = (child !== holdContainer) ? 'none' : 'block';
													});
													holdContainer.classList.add('selected')
													globals.boardSetup.holdSetup[hold.id] = {...globals.boardSetup.holdSetup[hold.id], 'hold': holdname}
													console.log(globals.boardSetup.holdSetup[hold.id])
													updateBoardJSON(hold);
													this.loadBoardSetup(globals.boardSetup);
												}

											}, false);
											let holdNameContainer = dce({el: 'div', cssClass: 'hold-name'});
											holdNameContainer.append(document.createTextNode(holdname ));
											holdContainer.append(holdImage, holdNameContainer );
											holdsContainer.append(holdContainer)
										}
									})
								});

								/** rotation */
								let rotationContainer = dce({el: 'div', cssStyle: 'display: flex'});
								rotationContainer.append(dce({el: 'h3', cssStyle: 'width: 50%', content: 'Rotation'}));

								let rotateHold = new dsInput({
									attrbs: [
										['type', 'range'],
										['min', 0],
										['max', 395],
										['step', 5],
										['value', globals.boardSetup.holdSetup[hold.id]?.rotation || 0]
									],
									oninput: (e) => {
										holdTransform['rotation'] = Number(e.target.value);
										updateBoardJSON(hold);
										},
									onchange: (e) => {
										this.loadBoardSetup(globals.boardSetup)
									}
								});
								rotationContainer.append(rotateHold);

								/** Offset X */
								let offsetXContainer = dce({el: 'div', cssStyle: 'display: flex'});
								offsetXContainer.append(dce({el: 'h3', cssStyle: 'width: 50%', content: 'Offset X'}));

								let offsetX = new dsInput({
									attrbs: [
										['type', 'range'],
										['min', -50],
										['max', 50],
										['step', 5],
										['value', globals.boardSetup.holdSetup[hold.id]?.offsetX || 0]
									],
									oninput: (e) => {
										holdTransform['offsetX'] = Number(e.target.value);
										updateBoardJSON(hold);
										},
										onchange: (e) => {
											this.loadBoardSetup(globals.boardSetup)
										}
								});
								offsetXContainer.append(offsetX);

								/** Offset Y */
								let offsetYContainer = dce({el: 'div', cssStyle: 'display: flex'});
								offsetYContainer.append(dce({el: 'h3', cssStyle: 'width: 50%', content: 'Offset Y'}));

								let offsetY = new dsInput({
									attrbs: [
										['type', 'range'],
										['min', -50],
										['max', 50],
										['step', 5],
										['value', globals.boardSetup.holdSetup[hold.id]?.offsetY || 0]
									],
									oninput: (e) => {
										holdTransform['offsetY'] = Number(e.target.value);
										updateBoardJSON(hold);
										},
										onchange: (e) => {
											this.loadBoardSetup(globals.boardSetup)
										}
								});
								offsetYContainer.append(offsetY);


								/** Scale X */
								let scaleXContainer = dce({el: 'div', cssStyle: 'display: flex'});
								scaleXContainer.append(dce({el: 'h3', cssStyle: 'width: 50%', content: 'Scale X'}));

								let scaleX = new dsInput({
									attrbs: [
										['type', 'range'],
										['min', -200],
										['max', 200],
										['step', 10],
										['value', globals.boardSetup.holdSetup[hold.id]?.scaleX || 100]
									],
									oninput: (e) => {
										holdTransform['scaleX'] = Number(e.target.value);
										updateBoardJSON(hold);
									},
									onchange: (e) => {
										this.loadBoardSetup(globals.boardSetup)
									}
								});
								scaleXContainer.append(scaleX);

								/** Scale Y */
								let scaleYContainer = dce({el: 'div', cssStyle: 'display: flex'});
								scaleYContainer.append(dce({el: 'h3', cssStyle: 'width: 50%', content: 'Scale Y'}));

								let scaleY = new dsInput({
									attrbs: [
										['type', 'range'],
										['min', -200],
										['max', 200],
										['step', 10],
										['value', globals.boardSetup.holdSetup[hold.id]?.scaleY || 100]
									],
									oninput: (e) => {
										holdTransform['scaleY'] = Number(e.target.value);
										updateBoardJSON(hold);
										},
										onchange: (e) => {
											this.loadBoardSetup(globals.boardSetup)
										}
								});
								scaleYContainer.append(scaleY);


								/** color */
								let colorContainer = dce({el: 'div', cssStyle: 'display: flex'});
								colorContainer.append(dce({el: 'h3', cssStyle: 'width: 50%', content: 'Color'}));

								let color = new dsInput({
									attrbs: [
										['type', 'color'],
										['min', -200],
										['max', 200],
										['step', 10],
										['style', 'padding: 0; width: 50px;'],
										['value', globals.boardSetup.holdSetup[hold.id]?.holdColor || '#000' ]
									],
									oninput: (e) => {
										holdTransform['holdColor'] = e.target.value;
										updateBoardJSON(hold);
										},
										onchange: (e) => {
											this.loadBoardSetup(globals.boardSetup)
										}
								});
								colorContainer.append(color);

								perse.append(holdsContainer,
									rotationContainer,
									offsetXContainer,
									offsetYContainer,
									scaleXContainer,
									scaleYContainer,
									colorContainer
									)

								let mother = document.querySelector('.app');
								let modalWindow = new dsModal({
									title: `Setup hold ${hold.id}`,
									content: perse,
									options: [{
										cancel: new dsButton({
											title: 'Cancel',
											cssClass: 'btn btn_small',
											thisOnClick: () => { modalWindow.close() }
										}),
										load: new dsButton({
											title: 'Load',
											cssClass: 'btn btn_small preferred',
											thisOnClick: () => { modalWindow.close() }
										})
									}],
								});
							mother.append(modalWindow);

							}, false)
						}
					}
				if(i>=0) {
					juuh.appendChild(gridCell);
					}
				}
			this.boardContainer.append(toprow, juuh);
			}
			/* SETUP CANVAS */
			this.setupCanvas = document.createElement("canvas");
			this.ctx = this.setupCanvas.getContext("2d");

			this.holdSize = 30; // size of SVG viewBox - must be 30 or everything will be fucked
			this.cellSize = 40; // size of SVG viewBox - must be 30 or everything will be fucked
			this.setupCanvas.width = this.holdSize * ( this.boardWidth +1 ) * window.devicePixelRatio;
			this.setupCanvas.height = this.holdSize * (this.boardHeight +1 )* window.devicePixelRatio;

			this.setupCanvas.style.width = ((this.boardWidth + 1) * cellSize) + "px";
			this.setupCanvas.style.height = ((this.boardHeight + 1) * cellSize) + "px";

			this.boardContainer.appendChild(this.setupCanvas);

			const dpr = window.devicePixelRatio; // vähä pikseleit vähä

			let perse = {};
			for(let i=0, j=this.boardHeight; i<j;i++) {
				for(let k=0, l=this.boardWidth; k<l;k++) {
					perse[`${this.boardCols[k]}${i+1}`]  = {};
				}
			}


			data.holdSetup = {...perse, ...data.holdSetup};

			for( let holds in data.holdSetup) {
				let holdCanvas = document.createElement("CANVAS")
				holdCanvas.width = this.holdSize * 2 * window.devicePixelRatio;
				holdCanvas.height = this.holdSize * 2 * window.devicePixelRatio;

				let holdCanvasctx = holdCanvas.getContext("2d");

				const { hold, rotation, scaleY, scaleX, holdColor, offsetX, offsetY } = data.holdSetup[holds];

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
					holdCanvasctx.shadowColor = 'rgba(0,0,0,.2)';
					holdCanvasctx.shadowBlur = this.holdSize / 4;
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
				holdCanvasctx.arc(holdCanvas.width / 2, holdCanvas.width / 2, 1.5, 0, 2 * Math.PI, false);
				holdCanvasctx.fillStyle = 'rgba(255,255,255,.8)';
				holdCanvasctx.strokeStyle = 'rgba(0,0,0,.5)';
				holdCanvasctx.lineWidth = 1;
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
					fetch(`/projects/napakboard/hold_setup_${globals.board}.json?adoUpdate=${new Date().getTime}`)
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
