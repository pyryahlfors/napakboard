//  import napakBoard       from '/js/components/napak_board/napak_board.js';
import { dce, storeObserver }  from './shared/helpers.js';
import { route } from './shared/route.js';
import { globals } from './shared/globals.js';
import { user } from './shared/user.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";  
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js'


import viewBoard from './templates/page_board.js';
import viewLogin from './templates/page_login.js';
import viewSignup from './templates/page_signup.js';
import viewResetPassword from './templates/page_reset-password.js';
import viewProfile from './templates/page_profile.js';

import otc from './templates/partials/section_otc.js';

const napakBoard = {
    initialize : () => {
        // Routes
        globals.routes.board = viewBoard;
        globals.routes.login = viewLogin;
        globals.routes.profile = viewProfile;
        globals.routes.resetPassword = viewResetPassword
        globals.routes.signup = viewSignup;

        const firebaseConfig = {
            apiKey: "AIzaSyCIKa0tKpjQhPynVjNO3sehFmJrGqocyLA",
            authDomain: "napak-board.firebaseapp.com",
            projectId: "napak-board",
            storageBucket: "napak-board.appspot.com",
            messagingSenderId: "809734457516",
            appId: "1:809734457516:web:adfea8fe6a0ac8c9983709"
        };
        const app = initializeApp(firebaseConfig);
        window.app = app;
        // Firebase
        // Your web app's Firebase configuration

        globals.boardRoutes = [];
           
        const appContainer = dce({el: 'DIV', cssClass : 'app'});
        const appContentContainer = dce({el: 'DIV', cssClass : 'page-content'});
  
        // Off the canvas navigation
        let otcMenu = new otc();
        let naviShadow = dce({el: 'DIV', cssClass: 'navi-shadow'});

        // Shadow
        naviShadow.addEventListener('click', () => {
          document.body.classList.remove('otc');
        }, false);

        appContainer.append(appContentContainer, naviShadow, otcMenu.render());
        document.body.appendChild(appContainer);

    // Listen changes in routes collection and update list
        const dbQuery = query(collection(getFirestore(), 'routes'));
        onSnapshot(dbQuery, (querySnapshot) => {
         const routes = [];
         querySnapshot.forEach((doc) => {
             let routeData = doc.data();
             routeData.id = doc.id;
             routes.push(routeData);
         });
         globals.boardRoutes = routes.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
         globals.standardMessage.push({message : `Routes updated - ${routes.length} routes found`, timeout: 1, id : 'homepage-routes'});
         globals.standardMessage = globals.standardMessage;
         });

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

        let loginStatus = () => {
          getAuth().onAuthStateChanged(function(authUser) {
            if (authUser) {
              user.login.isLoggedIn = true;
              user.login = user.login;
              route('board');
            } else {
              route('login');
            }
          });
        }
              
        loginStatus();

    }   
}

napakBoard.initialize();
