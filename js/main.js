import { dce, storeObserver }  from './shared/helpers.js';
import { route } from './shared/route.js';
import { globals } from './shared/globals.js';
import { user } from './shared/user.js';

import viewBoard from './templates/page_board.js';
import viewLogin from './templates/page_login.js';
import viewSignup from './templates/page_signup.js';
import viewResetPassword from './templates/page_reset-password.js';
import viewProfile from './templates/page_profile.js';
import viewHistory from './templates/page_history.js';

import otc from './templates/partials/section_otc.js';

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { collection, doc, getFirestore, onSnapshot, query } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

const napakBoard = {
    initialize : () => {
        // Routes
        globals.routes.board = viewBoard;
        globals.routes.login = viewLogin;
        globals.routes.profile = viewProfile;
        globals.routes.history = viewHistory;
        globals.routes.resetPassword = viewResetPassword
        globals.routes.signup = viewSignup;

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

        let loginStatus = () => {
          let redirect = document.location.hash.slice(2);

          if(user.login.isLoggedIn) {
			if(!globals.boardSetupMode) {
				// get routes from DB
				const dbQuery = query(collection(getFirestore(), 'routes'));
				onSnapshot(dbQuery, (querySnapshot) => {
				const routes = [];
				querySnapshot.forEach((doc) => {
					let routeData = doc.data();
					routeData.id = doc.id;
					routes.push(routeData);
				});

				if(routes.length !== globals.boardRoutes.length) {
				globals.standardMessage.push({message : `Routes updated - ${routes.length} routes found`, timeout: 1, id : 'homepage-routes'});
				globals.standardMessage = globals.standardMessage;
				}

				globals.boardRoutes = routes.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
				globals.sortedRoutes = globals.boardRoutes;
				});
			}

            route(globals.routes[redirect] ? redirect : 'board')
            }

          else { route('login'); }
        }

        user.storeObservers.push({key: 'login', callback: loginStatus})

        // call ones for autologin
        loginStatus();

        getAuth().onAuthStateChanged(function(authUser) {
          if( authUser ) {
            user.name.displayName = authUser.displayName;
            user.name.id = authUser.uid;
            user.login.isLoggedIn = true;

            user.name = user.name;
            user.login = user.login;
          }
        })
    }
}

napakBoard.initialize();
