/**
 * Route creation and editing functionality
 */

import { dce } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import dsModal from '../../components/ds-modal/index.js';
import dsButton from '../../components/ds-button/index.js';
import dsInput from '../../components/ds-input/index.js';
import dsSelect from '../../components/ds-select/index.js';
import { addDoc, collection, getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';

export class RouteEditor {
    constructor(boardContainer, db) {
        this.boardContainer = boardContainer;
        this.db = db;
    }

    clearRoute() {
        let selected = this.boardContainer.querySelectorAll('.selected');
        selected.forEach((el) => {el.classList.remove('selected', 'top', 'start', 'intermediate', 'foot')});
    }

    openClearDialog() {
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
                        this.clearRoute();
                        modalWindow.close()
                    }
                })
            }],
        });
        mother.append(modalWindow)
    }

    openSaveDialog(onUpdateBoard) {
        const names = [
            [
                "Cursed", "Funky", "Stinky", "Dusty", "Spicy", "Slippery", "Gnarly", "Chunky",
                "Gritty", "Wobbly", "Crispy", "Spooky", "Feisty", "Sticky", "Groovy", "Rowdy",
                "Wild", "Sketchy", "Crunchy", "Pumpy", "Greasy", "Bouncy", "Shady", "Frosty",
                "Toasty", "Janky", "Zesty", "Mellow", "Savage", "Nasty", "Saucy", "Floppy",
                "Clumsy", "Sneaky", "Bizarre", "Loud", "Quiet", "Turbo", "Hyper", "Lazy", "Chaotic"
            ],
            [
                "crimp", "sloper", "jug", "pinch", "heelhook", "toe", "finger", "forearms", "feet",
                "elbows", "dyno", "hangboard", "mantle", "arete", "pocket", "ledge", "volume", "crux",
                "beta", "campus", "ass", "smear", "gaston", "undercling", "sidepull", "match",
                "sequence", "flash", "project", "send", "whipper", "kneebar", "jam", "stack", "bridge",
                "rail", "edge", "slab", "overhang", "roof", "compression",

                "meatballs", "spaghetti", "noodles", "ramen", "dumplings", "sausage", "bacon", "burger", "cheeseburger", "pickle",
                "onion", "garlic", "kebab", "taco", "burrito", "pizza", "lasagna", "macaroni", "cheese", "hotdog",
                "fries", "waffles", "pancakes", "syrup", "donut", "cupcake", "brownie", "chocolate", "marshmallow", "icecream",

                "toaster", "microwave", "blender", "fork", "spoon", "ladle", "bucket", "shovel", "hammer", "sock",
                "underwear", "helmet", "toothbrush", "keyboard", "monitor", "mouse", "cable", "battery", "brick", "rock",

                "rat", "pigeon", "goose", "lizard", "slug", "snail", "worm", "crab", "monkey", "yak",
                "alien", "goblin", "troll", "wizard", "ghost", "skeleton", "zombie", "robot", "mutant", "gremlin",

                "butt", "elbowgrease", "sweat", "tears", "regret", "mistake", "chaos", "trash", "garbage", "nonsense",
                "vibes", "energy", "juice", "sauce", "flavor", "spice", "crust", "goo", "slime", "gunk",
            ],
            [
                "fest", "party", "mayhem", "madness", "parade", "circus", "riot", "fiesta", "meltdown", "jam",
                "explosion", "showdown", "shuffle", "brawl", "derby", "hustle", "grind", "saga", "odyssey",
                "storm", "fuck", "shit", "chaos", "bonanza", "bash", "throwdown", "clash", "rampage",
                "stampede", "rave", "uproar", "frenzy", "spectacle", "skirmish", "onslaught", "blitz", "quake",
                "eruption", "disaster", "panic", "wreckage", "apocalypse", "jesus", "bullshit", "horseshit",
                "ass", "asshole", "dumbass", "jackass", "bastard", "sonofabitch", "motherfucker", "shitshow",
                "clusterfuck", "fuckfest", "dipshit", "shitbag", "douche", "douchebag", "wanker", "prick"
            ]
        ];

        const randomName = () => {
            let name = "";
            for (let i = 0; i < names.length; i++) {
                const partList = names[i];
                const part = partList[Math.floor(Math.random() * partList.length)];
                name += `${part} `;
            }
            return name;
        };

        let saveDialog = dce({el:'FORM', cssStyle: 'padding: 10px 0'});

        let routeNameContainer = dce({el:'div', cssClass: 'mb', cssStyle: 'display: flex; align-items: flex-end; justify-content: space-between;'});

        let routeName = new dsInput({
            label: 'ROUTE NAME',
            attrbs: [
                ['placeholder', ''],
                ['name', 'routename']
            ],
            cssStyle: 'width: 100%;'
        });

        let randomize = new dsButton({
            title: 'Randomize',
            cssClass: 'btn btn_small'
        });

        randomize.addEventListener('click', (e)=>{
            e.preventDefault();
            document.querySelector('input[name="routename"]').value = randomName();
        }, false)

        let setter = new dsInput({label: 'SETTER', attrbs: [
            ['placeholder', ''],
            ['name', 'routesetter'],
            ['value', getAuth().currentUser.displayName || 'Anonymous']
        ]});

        let setterid = new dsInput({attrbs: [
            ['name', 'setterid'],
            ['value', getAuth().currentUser.uid],
            ['hidden', true]
        ]});

        let angles = Array();
        for(let i=0, j=80; i<=j; i+=5) {
            angles.push([`${i}`, i, i === Number(globals.boardAngle)]);
        }

        let angle = new dsSelect({
            label: 'ANGLE',
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

        let grade = new dsSelect({label: 'GRADE', options: gradeOptions, cssClass: 'mb'})

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
                            callBack: () => { modalWindow.close() },
                            onUpdateBoard
                        })
                    }
                })
            }],
        });

        mother.append(modalWindow)
    }

    validateAndSave(params) {
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

                    const newMirrorRoute = await addDoc(collection(this.db, "routes"), {
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
                    params.callBack();
                    globals.selectedRouteId = newRoute.id;
                    params.onUpdateBoard();
                }
            })();
        }
    }
}
