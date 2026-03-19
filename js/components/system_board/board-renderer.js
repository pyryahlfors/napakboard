/**
 * Board rendering and hold drawing functionality.
 */

import { dce, svg } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';

export class BoardRenderer {
    constructor(onBoardChange) {
        this.onBoardChange = onBoardChange;
        this.holdImages = null;
        this.holdSize = 30;
        this.cellSize = 40;
        this.boardCols = 'abcdefghijklmnopqrstuvwxyz';
        this.timerStart = 0;
        this.timerEnd = 0;
    }

    notifyBoardChanged() {
        if(typeof this.onBoardChange === 'function') {
            this.onBoardChange();
        }
    }

    getHoldSetup() {
        this.holdImages = svg({el: 'svg', attrbs: [["viewBox", "0 0 0 0"]]});

        fetch('/projects/napakboard/images/holds.svg?update=true')
            .then((r) => r.text())
            .then((text) => {
                this.holdImages.innerHTML = text;
            })
            .catch(console.error.bind(console));
    }

    drawHolds(boardContainer, data) {
        globals.boardSetup = data;
        const boardHeight = data.characteristics.height;
        const boardWidth = data.characteristics.width;

        boardContainer.style.height = `${(boardHeight + 1) * this.cellSize}px`;
        boardContainer.style.width = `${(boardWidth + 1) * this.cellSize}px`;

        const topRow = dce({
            el: 'div',
            cssStyle: `position: sticky; z-index: 2; top: 0; height: ${this.cellSize}px`
        });
        const cellsContainer = dce({el: 'div'});

        for(let row = -1; row < boardHeight; row++) {
            for(let col = -1; col < boardWidth; col++) {
                const gridCell = dce({
                    el: 'div',
                    cssStyle: `left: ${(col + 1) * this.cellSize}px; top: ${(row + 1) * this.cellSize}px; height: ${this.cellSize}px; width: ${this.cellSize}px`
                });
                gridCell.className = 'grid-cell';

                if(row < 0) {
                    gridCell.innerHTML = (col >= 0) ? this.boardCols[col] : '';
                    gridCell.classList.add('row-name', 'row-letter');
                    if(col < 0) {
                        gridCell.classList.add('top-corner');
                    }
                    topRow.append(gridCell);
                    continue;
                }

                if(col < 0) {
                    gridCell.innerHTML = boardHeight - row;
                    gridCell.classList.add('row-name', 'row-number');
                    cellsContainer.appendChild(gridCell);
                    continue;
                }

                const tipSpan = document.createElement('span');
                if(row === 0) {
                    tipSpan.className = 'tip-below';
                }

                gridCell.append(tipSpan);
                gridCell.id = `${this.boardCols[col]}${row + 1}`;

                gridCell.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.timerStart = new Date().getTime();
                }, false);

                gridCell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const hold = e.target;
                    hold.classList.remove('selected', 'intermediate', 'foot', 'start', 'top');
                    globals.standardMessage = [
                        ...globals.standardMessage,
                        { message: 'Removed hold from route', timeout: 1 }
                    ];
                    this.notifyBoardChanged();
                }, false);

                gridCell.addEventListener('mouseup', (e) => {
                    e.preventDefault();
                    if(globals.selectedRoute !== null) {
                        return;
                    }

                    this.timerEnd = new Date().getTime();
                    const hold = e.target;
                    const holdTypes = ['intermediate', 'foot', 'start', 'top'];

                    if(this.timerEnd - this.timerStart < 500) {
                        if(hold.classList.contains('selected')) {
                            let currentHoldType = null;
                            let currentHoldOrder = -1;

                            holdTypes.forEach((type, index) => {
                                if(hold.classList.contains(type)) {
                                    currentHoldType = type;
                                    currentHoldOrder = index;
                                }
                            });

                            if(currentHoldType !== null) {
                                hold.classList.remove(currentHoldType);
                            }

                            const nextOrder = currentHoldOrder + 1;
                            if(nextOrder >= holdTypes.length) {
                                hold.classList.remove('selected', 'undefined');
                                globals.standardMessage = [{
                                    message: `Removed hold from ${this.boardCols[col]}${boardHeight - row}`,
                                    timeout: 1
                                }];
                            } else {
                                hold.classList.add(holdTypes[nextOrder]);
                                globals.standardMessage = [{
                                    message: `Added - ${holdTypes[nextOrder]} hold to ${this.boardCols[col]}${boardHeight - row}`,
                                    timeout: 1
                                }];
                            }
                        } else {
                            hold.classList.add('selected', holdTypes[0]);
                            globals.standardMessage = [{
                                message: `Added - ${holdTypes[0]} hold to ${this.boardCols[col]}${boardHeight - row}`,
                                timeout: 1
                            }];
                        }
                    } else {
                        hold.classList.remove('selected', 'intermediate', 'foot', 'start', 'top');
                        globals.standardMessage = [{
                            message: `Removed hold from ${this.boardCols[col]}${boardHeight - row}`,
                            timeout: 1
                        }];
                    }

                    this.notifyBoardChanged();
                }, false);

                cellsContainer.appendChild(gridCell);
            }
        }

        boardContainer.append(topRow, cellsContainer);
        this.drawHoldCanvas(boardContainer, data, boardWidth, boardHeight);
    }

    drawHoldCanvas(boardContainer, data, boardWidth, boardHeight) {
        const setupCanvas = document.createElement('canvas');
        const ctx = setupCanvas.getContext('2d');
        const dpr = window.devicePixelRatio;

        setupCanvas.width = this.holdSize * (boardWidth + 1) * dpr;
        setupCanvas.height = this.holdSize * (boardHeight + 1) * dpr;
        setupCanvas.style.width = `${(boardWidth + 1) * this.cellSize}px`;
        setupCanvas.style.height = `${(boardHeight + 1) * this.cellSize}px`;
        setupCanvas.style.top = `${this.cellSize / 2}px`;
        setupCanvas.style.left = `${this.cellSize / 2}px`;

        boardContainer.appendChild(setupCanvas);

        const boardHolds = {};
        for(let row = 0; row < boardHeight; row++) {
            for(let col = 0; col < boardWidth; col++) {
                boardHolds[`${this.boardCols[col]}${row + 1}`] = {};
            }
        }

        data.holdSetup = {...boardHolds, ...data.holdSetup};

        for(const holdId in data.holdSetup) {
            const holdCanvas = document.createElement('canvas');
            holdCanvas.width = this.holdSize * 2 * dpr;
            holdCanvas.height = this.holdSize * 2 * dpr;
            const holdCanvasCtx = holdCanvas.getContext('2d');

            const { hold, rotation, scaleY, scaleX, holdColor, offsetX, offsetY, mirror } = data.holdSetup[holdId];

            if(mirror && document.getElementById(holdId)) {
                document.getElementById(holdId).classList.add('mirrored');
            }

            if((hold || holdColor) && this.holdImages) {
                let cloneHold = this.holdImages.querySelector(`[data-name='${hold}']`);
                if(!cloneHold) {
                    cloneHold = this.holdImages.querySelector("[data-name='placeholder']");
                }

                if(cloneHold) {
                    const holdPath = new Path2D(cloneHold.cloneNode(true).getAttribute('d'));
                    const scaleHold = new Path2D();
                    const scaleXX = ((scaleX ? scaleX * 0.01 : 1) * dpr);
                    const scaleYY = ((scaleY ? scaleY * 0.01 : 1) * dpr);
                    const scalePosX = holdCanvas.width / 2 - (this.holdSize * scaleXX) / 2;
                    const scalePosY = holdCanvas.height / 2 - (this.holdSize * scaleYY) / 2;
                    const boltOffsetX = offsetX ? (this.holdSize / 100) * offsetX : 0;
                    const boltOffsetY = offsetY ? (this.holdSize / 100) * offsetY : 0;

                    scaleHold.addPath(
                        holdPath,
                        new DOMMatrix()
                            .translate(scalePosX + boltOffsetX * dpr, scalePosY + boltOffsetY * dpr)
                            .scale(scaleXX, scaleYY)
                    );

                    const transformedHold = new Path2D();
                    transformedHold.addPath(
                        scaleHold,
                        new DOMMatrix()
                            .translate(holdCanvas.width / 2, holdCanvas.height / 2)
                            .rotate(rotation ? rotation : 0)
                            .translate(-holdCanvas.width / 2, -holdCanvas.height / 2)
                    );

                    holdCanvasCtx.save();
                    holdCanvasCtx.shadowColor = 'rgba(0,0,0,.3)';
                    holdCanvasCtx.shadowBlur = this.holdSize / 8;
                    holdCanvasCtx.fillStyle = holdColor || '#000';
                    holdCanvasCtx.lineWidth = 1;
                    holdCanvasCtx.fill(transformedHold);
                    holdCanvasCtx.strokeStyle = 'rgba(0,0,0,.3)';
                    holdCanvasCtx.stroke(transformedHold);
                    holdCanvasCtx.restore();
                }
            }

            holdCanvasCtx.shadowColor = 'transparent';
            holdCanvasCtx.shadowBlur = 0;
            holdCanvasCtx.arc(holdCanvas.width / 2, holdCanvas.width / 2, 2.5, 0, 2 * Math.PI, false);
            holdCanvasCtx.fillStyle = 'rgba(255,255,255,.8)';
            holdCanvasCtx.strokeStyle = 'rgba(0,0,0,.5)';
            holdCanvasCtx.lineWidth = 2;
            holdCanvasCtx.fill();
            holdCanvasCtx.stroke();

            const x = Number(this.boardCols.indexOf(holdId.toString()[0]));
            const y = Number(holdId.replace(/\D/g, '') - 1);
            ctx.drawImage(holdCanvas, x * this.holdSize * dpr, y * this.holdSize * dpr);
        }
    }

    clearRoute(boardContainer) {
        const selected = boardContainer.querySelectorAll('.selected');
        selected.forEach((el) => {
            el.classList.remove('selected', 'top', 'start', 'intermediate', 'foot');
        });
    }

    updateRouteDisplay(boardContainer, holdSetup) {
        for(const hold in holdSetup) {
            const holdEl = boardContainer.querySelector(`#${hold}`);
            if(holdEl) {
                holdEl.classList.add('selected', `${holdSetup[hold]}`);
            }
        }
    }
}
