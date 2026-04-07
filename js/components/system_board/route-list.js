/**
 * Route list, filtering, and discovery functionality
 */

import { dce, storeObserver } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import { handleDate } from '../../shared/date.js';
import dsModal from '../../components/ds-modal/index.js';
import dsButton from '../../components/ds-button/index.js';
import dsInput from '../../components/ds-input/index.js';
import dsSelect from '../../components/ds-select/index.js';
import dsToggle from '../../components/ds-toggle/index.js';
import dsRadio from '../ds-radio/index.js';
import dsLegend from '../ds-legend/index.js';
import { collection, doc, getFirestore, getDoc, onSnapshot, query, updateDoc, setDoc, where } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';
import { calculateRouteScore, getRouteSortScore } from './route-utils.js';

export class RouteListManager {
    constructor(db, onLoadRoute) {
        this.db = db;
        this.onLoadRoute = onLoadRoute;
        this.userTodoRouteIds = new Set();
    }

    async loadUserTodos() {
        const currentUser = getAuth().currentUser;
        if(!currentUser) {
            this.userTodoRouteIds = new Set();
            return;
        }

        try {
            const userRef = doc(this.db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            const todos = userSnap.exists() && Array.isArray(userSnap.data().todos)
                ? userSnap.data().todos
                : [];

            this.userTodoRouteIds = new Set(
                todos
                    .map((todo) => (todo && typeof todo === 'object' ? todo.routeId : null))
                    .filter(Boolean)
            );
        } catch(error) {
            console.error('Failed to load TODO routes:', error);
            this.userTodoRouteIds = new Set();
        }
    }

    open() {
        let selectedRoute = null;
        delete globals.routeNameSearch;
        let listDialog = dce({el:'div'});
        let sortOptionsContainer = dce({el: 'form', cssClass: 'routefilters', cssStyle: 'z-index: 2; margin-left: -20px; margin-right: -20px; padding: 10px 20px; background: rgb(32,32,32)', attrbs: [["name", "routesort"]]});
        sortOptionsContainer.onsubmit = (e) => {
            e.preventDefault();
            return;
        }

        // Name input
        let name = new dsInput({
            attrbs: [
                ['placeholder', 'Route name'],
                ['name', 'routename'],
                ['value', globals.routeNameSearch || '']
            ],
            onkeyup: (e) => {
                if(e.target) {
                    globals.routeNameSearch = e.target.value;
                }
            }
        });

        let routeNameContainer = dce({el: 'div', cssStyle: 'display: flex; margin: 0;  justify-content: space-between; align-items: center;'})
        routeNameContainer.append(
            dce({el: 'h3', content: 'Route Name', cssStyle: 'text-align: center; color: #aaa; font-weight: 300'}),
            name
        );

        sortOptionsContainer.append(routeNameContainer, document.createElement("hr") );

        // Angle selector
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
            name: 'sort',
            options: [
                {
                    title: "grade",
                    value: "grade",
                    checked: (globals.routeSorting === 'grade' || globals.routeSorting === 'name' || !globals.routeSorting) ? true : false
                },
                {
                    title: "date",
                    value: "date",
                    checked: globals.routeSorting === 'date' ? true : false
                },
                {
                    title: "approval",
                    value: "approval",
                    checked: globals.routeSorting === 'approval' ? true : false
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

        // Order
        let order = new dsRadio({
            cssClass: 'radio-menu',
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

        // My ticks toggle
        let toggleMyAscents = new dsToggle({
            cssClass  : 'horizontal-menu justify-center full-width',
            targetObj : 'excludeTicks',
            options   : [
                {title: 'Include', value: false, selected: globals.excludeTicks === false},
                {title: 'Exclude', value: true, selected: globals.excludeTicks === true}
            ],
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

        const observer = new IntersectionObserver(
            ([e]) => e.target.classList.toggle('isSticky', e.intersectionRatio < 1),
            {threshold: [1]}
        );

        observer.observe(showFiltersContainer);
        showFiltersContainer.append(showFilters);

        listDialog.append(sortOptionsContainer, routeCountContainer, showFiltersContainer);
        listDialog.append(dce({el: 'div', cssClass: 'loading', content: 'Loading routes...'}));

        // Database listener for routes
        const dbQuery = query(collection(getFirestore(), 'routes'), where('napakboard', '==', globals.board));
        let routesUnsubscribe = onSnapshot(dbQuery, (querySnapshot) => {
            const routes = [];
            querySnapshot.forEach((doc) => {
                let routeData = doc.data();
                routeData.id = doc.id;
                routes.push(routeData);
            });
            globals.boardRoutes = routes.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
            globals.sortedRoutes = globals.boardRoutes;
        });

        // Update route list
        const updateRouteList = () => {
            let loader = listDialog.querySelector('.loading');
            if(loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }

            let routelistContainer = dce({el: 'div', cssClass : 'route-list-container'});

            let routes = globals.boardRoutes;
            globals.sortedRoutes = [];
            if(globals.routeSorting === 'grade') { routes = globals.boardRoutes.sort((a,b) => a.grade - b.grade) }
            if(globals.routeSorting === 'date')  { routes = globals.boardRoutes.sort((a,b) => (a.added > b.added) ? 1 : ((b.added > a.added) ? -1 : 0)) }
            if(globals.routeSorting === 'approval') { routes = globals.boardRoutes.sort((a, b) => getRouteSortScore(a) - getRouteSortScore(b)) }

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
                    let routeItem = dce({el: 'DIV', cssClass: 'route-list-item'});
                    routeItem.style.position = 'relative';
                    if( globals.selectedRouteId === routeData.id ) { routeItem.classList.add('selected'); }
                    if( routeData.ticks && routeData.ticks.includes(getAuth().currentUser.uid) ) { routeItem.classList.add('climbed'); }
                    let routeName = dce({el: 'h3', content: routeData.name});

                    let routeDetails = dce({el: 'div'});
                    let routeGrade = new dsLegend({title: globals.grades.font[routeData.grade], type: 'grade', cssClass: globals.difficulty[routeData.grade]})
                    let routeMirror = new dsLegend({title: 'MIRROR', type: 'routeType', cssClass: 'mirror'})

                    let routeAdded = dce({el: 'div', content: handleDate({dateString: new Date(routeData.added.toDate())})});
                    let routeSetter = dce({el: 'div', content: `by ${routeData.setter}`});
                    let routeRepeats = dce({el: 'div', content: (routeData.ticks ? `- ${routeData.ticks.length} repeat${routeData.ticks.length > 1 ? 's' : ''}` : '')});
                    const routeScoreData = calculateRouteScore(routeData);
                    let routeScore = null;
                    if(routeScoreData) {
                        routeScore = new dsLegend({title: routeScoreData.score, type: 'ascent', cssClass: Number(routeScoreData.score) < 100 ? 'bad' : 'good'})
                    }

                    routeDetails.append(routeGrade, routeAdded, routeSetter, routeRepeats);

                    let routeTags = dce({el: 'div', cssStyle: 'display: flex', cssStyle: 'margin-top: 8px'});

                    if(routeData.mirror) { routeTags.append(routeMirror);}
                    if(routeScore) {routeTags.append(routeScore);}

                    routeItem.append(routeName, routeDetails);

                    if(this.userTodoRouteIds.has(routeData.id)) {
                        let todoRibbon = dce({el: 'div', cssClass: 'ribbon'});
                        routeItem.append(todoRibbon);
                    }

                    if(routeData.mirror || routeScore) routeItem.append(routeTags);

                    routeItem.addEventListener('click', () => {
                        let toggleSelected = listDialog.querySelectorAll('.selected');
                        toggleSelected.forEach( ( el) => {el.classList.remove('selected')});
                        routeItem.classList.add('selected');
                        selectedRoute = routeData.id;
                    }, false);

                    let routeItemContainer = dce({el: 'DIV', cssStyle: 'position: relative'});
                    let todoButton = new dsButton({
                        title: 'TODO',
                        cssClass: 'btn btn_tiny',
                        cssStyle: 'position: absolute; bottom: 10px; right: 10px;',
                        thisOnClick: async () => {
                            const userId = getAuth().currentUser && getAuth().currentUser.uid;
                            if(!userId) { return; }

                            try {
                                const userRef = doc(this.db, 'users', userId);
                                const userSnap = await getDoc(userRef);
                                const currentTodos = userSnap.exists() && Array.isArray(userSnap.data().todos)
                                    ? userSnap.data().todos
                                    : [];

                                const hasTodoAlready = currentTodos.some((todo) => todo && todo.routeId === routeData.id);

                                let nextTodos;
                                let message;

                                if(hasTodoAlready) {
                                    // Remove from TODO
                                    nextTodos = currentTodos.filter((todo) => todo && todo.routeId !== routeData.id);
                                    message = `${routeData.name} removed from TODO`;
                                    this.userTodoRouteIds.delete(routeData.id);
                                } else {
                                    // Add to TODO
                                    nextTodos = [
                                        ...currentTodos,
                                        {
                                            routeId: routeData.id,
                                            date: new Date().getTime()
                                        }
                                    ];
                                    message = `${routeData.name} added to TODO`;
                                    this.userTodoRouteIds.add(routeData.id);
                                }

                                await setDoc(userRef, {
                                    todos: nextTodos
                                }, { merge: true });

                                updateRouteList();

                                globals.standardMessage.push({message, timeout: 1});
                                globals.standardMessage = globals.standardMessage;
                            } catch(error) {
                                console.error('Failed to toggle TODO:', error);
                            }
                        }
                    });

                    routeItemContainer.append(routeItem, todoButton);

                    if(isAdmin) {
                        let removeButton = new dsButton({
                            title: 'Archive',
                            cssClass: 'btn btn_tiny destructive',
                            cssStyle: 'position: absolute; top: 10px; right: 10px;',
                            thisOnClick: () => {
                                if(window.confirm('Are you sure?')) {
                                    const routeReg = doc(this.db, "routes", routeData.id);
                                    updateDoc(routeReg, { 'archived': true}, {merge: true});
                                    alert(`Route ${routeData.id} archived`);
                                }
                            }
                        });
                        routeItemContainer.append(removeButton);
                    }

                    routelistContainer.appendChild(routeItemContainer);

                    globals.sortedRoutes.push(routeData)
                }
            });

            if(listDialog.querySelector('.route-list-container')) {
                let clearList = listDialog.querySelector('.route-list-container');
                clearList.parentNode.removeChild(clearList);
            }
            listDialog.append(routelistContainer);
            routeCountContainer.innerHTML = `Showing ${globals.sortedRoutes.length} routes`;
        };

        // Sorting options
        const updateRouteListSorting = () => {
            if(globals.routeSorting === 'grade') { globals.boardRoutes = globals.boardRoutes.sort((a,b) => a.grade - b.grade) }
            if(globals.routeSorting === 'date')  { globals.boardRoutes = globals.boardRoutes.sort((a,b) => (a.added > b.added) ? 1 : ((b.added > a.added) ? -1 : 0)) }
            if(globals.routeSorting === 'approval') { globals.boardRoutes = globals.boardRoutes.sort((a, b) => getRouteSortScore(a) - getRouteSortScore(b)) }
        };

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
            callback: () => {updateRouteList()}
        });

        storeObserver.add({
            store: globals,
            key: 'routeSorting',
            id: 'sortRoutesBy',
            callback: () => {updateRouteListSorting()}
        });

        this.loadUserTodos().then(() => {
            updateRouteList();
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
                        if(routesUnsubscribe) { routesUnsubscribe(); routesUnsubscribe = null; }
                        modalWindow.close();
                    }
                }),
                load: new dsButton({
                    title: 'Load',
                    cssClass: 'btn btn_small preferred',
                    thisOnClick: () => {
                        if(routesUnsubscribe) { routesUnsubscribe(); routesUnsubscribe = null; }
                        if(selectedRoute) {
                            this.onLoadRoute(selectedRoute);
                        }
                        modalWindow.close()
                    }
                })
            }],
        });
        mother.append(modalWindow)
    }
}
