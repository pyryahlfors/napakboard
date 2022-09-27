//  import napakBoard       from '/js/components/napak_board/napak_board.js';
import { dce }  from './shared/helpers.js';
import { route } from './shared/route.js';
import { globals } from './/shared/globals.js';

import viewBoard from '/js/templates/page_board.js';
import dsTicker from '/js/components/ds-ticker/index.js';


const napakBoard = {
    initialize : () => {
        // Routes
        globals.routes.board = viewBoard;

        // Firebase
        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCIKa0tKpjQhPynVjNO3sehFmJrGqocyLA",
            authDomain: "napak-board.firebaseapp.com",
            projectId: "napak-board",
            storageBucket: "napak-board.appspot.com",
            messagingSenderId: "809734457516",
            appId: "1:809734457516:web:adfea8fe6a0ac8c9983709"
        };
        firebase.initializeApp(firebaseConfig);

        globals.boardRoutes = [];
           
        const appContainer = dce({el: 'DIV', cssClass : 'app'});
        const appContentContainer = dce({el: 'DIV', cssClass : 'page-content'});
  
        appContainer.append(appContentContainer);

        let appTicker = new dsTicker();
        appContainer.appendChild(appTicker)
        document.body.appendChild(appContainer);


        appTicker.notify({title: 'Fetching routes'});
        const db = firebase.firestore();
        db.collection('routes').onSnapshot(function(querySnapshot) {
            var routes = [];
            querySnapshot.forEach(function(doc) {
                let routeData = doc.data();
                routeData.id = doc.id;
                routes.push(routeData);
            });
            globals.boardRoutes = routes;
            appTicker.update({title: `${routes.length} routes found`});
            appTicker.hide({timeOut: 1000});
          });


        route('board'); 
    }   
}

napakBoard.initialize();
