import systemBoard from './js/systemboard.js';
import fireStore from './js/firestore.js';

// init board
const mySystemBoard = new systemBoard();
mySystemBoard.initialize();

// init firebase
const db = new fireStore().initialize();

let current = null;

const routeDoc = db.collection('current').doc(`currentRoute_${mySystemBoard.boardId}`);

routeDoc.onSnapshot(
  (doc) => {
    if(!doc.exists) return;
    const { routeId, routeName, routeData } = doc.data();
    if(!routeData) return;

    if(JSON.stringify(routeData) === JSON.stringify(current)) return;
    console.log(`Name: ${routeName} - ID: ${routeId}`);
    console.log('route data: ', routeData);
    mySystemBoard.lit(routeData);
    current = routeData;
  },
  (error) => {
    console.error(error);
  }
);
