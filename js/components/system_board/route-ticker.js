/**
 * Route completion tracking and approval system
 */

import { dce } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';
import dsModal from '../../components/ds-modal/index.js';
import dsButton from '../../components/ds-button/index.js';
import dsRadio from '../ds-radio/index.js';
import { doc, getFirestore, getDoc, arrayRemove, arrayUnion, updateDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';

export class RouteTicker {
    constructor(db) {
        this.db = db;
    }

    async open() {
        let mother = document.querySelector('.app');

        if(!globals.selectedRouteId) {
            return;
        }

        const currentUser = getAuth().currentUser;
        if(!currentUser) {
            return;
        }

        // check if user has already climbed selected route
        const routeRef = doc(this.db, "routes", globals.selectedRouteId);
        const routeSnap = await getDoc(routeRef);
        const routeData = routeSnap.exists() ? routeSnap.data() : {};
        let climbed = Array.isArray(routeData.ticks) && routeData.ticks.includes(currentUser.uid);

        let tickDialog = dce({el:'div', cssStyle: 'padding: 10px 0 20px; text-align: center'});
        let confirm = dce({el: 'p', content: climbed ? 'You have already ticked this route. Want to remove it?' : ''});
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

            let approval = new dsRadio({
                cssClass: 'radio-menu mt',
                title: 'Did you like it',
                name: 'approval',
                options: [
                    {
                        title: "👎",
                        value: -1,
                    },
                    {
                        title: "🫤",
                        value: 0,
                        checked: true
                    },
                    {
                        title: "👍",
                        value: 1
                    }
                ]});

            let difficulty = new dsRadio({
                cssClass: 'radio-menu mt',
                title: 'Route difficulty',
                name: 'difficulty',
                options: [
                    {
                        title: 'Easier',
                        value: -1,
                    },
                    {
                        title: 'On grade',
                        value: 0,
                        checked: true
                    },
                    {
                        title: 'Sandbag',
                        value: 1
                    }
                ]});

            routeTickForm.append(tickType, approval, difficulty);
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
                    thisOnClick: async () => {
                        if(!globals.selectedRouteId) {
                            modalWindow.close();
                            return;
                        }

                        const userId = currentUser.uid;
                        const routeRef = doc(this.db, "routes", globals.selectedRouteId);
                        const userRef = doc(this.db, "users", userId);

                        try {
                            // remove tick + remove this user's approval
                            if(climbed) {
                                await updateDoc(routeRef, { ticks: arrayRemove(userId) });

                                const [routeSnap, userSnap] = await Promise.all([
                                    getDoc(routeRef),
                                    getDoc(userRef)
                                ]);

                                const currentApprovals = routeSnap.exists() && Array.isArray(routeSnap.data().approvals)
                                    ? routeSnap.data().approvals
                                    : [];
                                const nextApprovals = currentApprovals.filter((item) => item && item.userId !== userId);
                                await updateDoc(routeRef, { approvals: nextApprovals });

                                const currentTicks = userSnap.exists() && Array.isArray(userSnap.data().ticks)
                                    ? userSnap.data().ticks
                                    : [];
                                const nextTicks = currentTicks.filter((route) => route.routeId !== globals.selectedRouteId);
                                await updateDoc(userRef, { ticks: nextTicks });

                                globals.standardMessage.push({message : `Tick removed`, timeout: 1});
                                globals.standardMessage = globals.standardMessage;
                            }

                            // add tick + store this user's approval
                            else {
                                const form = document.forms['tick-form'];
                                const tickType = form && form.tick ? form.tick.value : 'flash';
                                const approvalValue = form && form.approval ? Number(form.approval.value) : 0;
                                const difficultyValue = form && form.difficulty ? Number(form.difficulty.value) : 0;
                                const now = new Date().getTime();

                                await updateDoc(routeRef, { ticks: arrayUnion(userId) });

                                const routeSnap = await getDoc(routeRef);
                                const currentApprovals = routeSnap.exists() && Array.isArray(routeSnap.data().approvals)
                                    ? routeSnap.data().approvals
                                    : [];
                                const filteredApprovals = currentApprovals.filter((item) => item && item.userId !== userId);
                                filteredApprovals.push({
                                    userId: userId,
                                    value: approvalValue,
                                    difficulty: difficultyValue,
                                    date: now
                                });
                                await updateDoc(routeRef, { approvals: filteredApprovals });

                                await updateDoc(userRef, { ticks: arrayUnion(
                                    {
                                        routeId: globals.selectedRouteId,
                                        type: tickType,
                                        approval: approvalValue,
                                        difficulty: difficultyValue,
                                        date: now,
                                    })
                                });

                                // Remove route from user's TODO list when climbed
                                const userSnap = await getDoc(userRef);
                                const currentTodos = userSnap.exists() && Array.isArray(userSnap.data().todos)
                                    ? userSnap.data().todos
                                    : [];
                                const nextTodos = currentTodos.filter((todo) => todo && todo.routeId !== globals.selectedRouteId);
                                await updateDoc(userRef, { todos: nextTodos });

                                globals.standardMessage.push({message : `${globals.selectedRoute} ticked`, timeout: 1});
                                globals.standardMessage = globals.standardMessage;
                            }
                        } catch(error) {
                            console.error('Tick update failed:', error);
                            globals.standardMessage.push({message : `Tick update failed`, timeout: 1});
                            globals.standardMessage = globals.standardMessage;
                        }

                        modalWindow.close()
                    }
                })
            }],
        });
        mother.append(modalWindow)
    }
}
