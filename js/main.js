//  import napakBoard       from '/js/components/napak_board/napak_board.js';
import { dce, storeObserver }  from './shared/helpers.js';
import { route } from './shared/route.js';
import { globals } from './shared/globals.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";  
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { getFirestore, getDocs, collection, query, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import viewBoard from './templates/page_board.js';

const napakBoard = {
    initialize : () => {
        // Routes
        globals.routes.board = viewBoard;

        const firebaseConfig = {
            apiKey: "AIzaSyCIKa0tKpjQhPynVjNO3sehFmJrGqocyLA",
            authDomain: "napak-board.firebaseapp.com",
            projectId: "napak-board",
            storageBucket: "napak-board.appspot.com",
            messagingSenderId: "809734457516",
            appId: "1:809734457516:web:adfea8fe6a0ac8c9983709"
        };
        initializeApp(firebaseConfig);
        // Firebase
        // Your web app's Firebase configuration

        globals.boardRoutes = [];
           
        const appContainer = dce({el: 'DIV', cssClass : 'app'});
        const appContentContainer = dce({el: 'DIV', cssClass : 'page-content'});
  
        appContainer.append(appContentContainer);

        document.body.appendChild(appContainer);

        const dbQuery = query(collection(getFirestore(), 'routes'));
        onSnapshot(dbQuery, (querySnapshot) => {
         const routes = [];
         querySnapshot.forEach((doc) => {
             let routeData = doc.data();
             routeData.id = doc.id;
             routes.push(routeData);
         });
         globals.boardRoutes = routes;        
         globals.standardMessage.push({message : `Routes updated - ${routes.length} routes found`, timeout: 1, id : 'homepage-routes'});
         globals.standardMessage = globals.standardMessage;
         });
  /*
        const db = firebase.firestore();
        db.collection('routes').orderBy('name').onSnapshot(function(querySnapshot) {
            var routes = [];
            querySnapshot.forEach(function(doc) {
                let routeData = doc.data();
                routeData.id = doc.id;
                routes.push(routeData);
            });
            globals.boardRoutes = routes;        
            globals.standardMessage.push({message : `Routes updated - ${routes.length} routes found`, timeout: 1, id : 'homepage-routes'});
            globals.standardMessage = globals.standardMessage;
        });
*/
        const notify = () => {
            globals.serverMessage.push({message : 'Fetching new data', timeout: 1, id : 'tick-sync'});
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
      

        route('board'); 
    }   
}

napakBoard.initialize();
