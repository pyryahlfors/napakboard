import { dce } from '../shared/helpers.js';
import { user } from '../shared/user.js';
import { route } from '../shared/route.js';

import { getAuth, updateProfile } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';

import bottomNavi   from '../components/bottom_navi/bottom_navi.js';



class viewProfile {
  constructor() {
    const db = getFirestore();

    document.body.classList.remove('otc');
    let container = dce({el: 'DIV', cssClass: 'page-profile'});
    let profileContainer = dce({el: 'DIV', cssClass: 'profile-container'});
    let loginFormContainer = dce({el: 'SECTION', cssClass: 'profile-form'});

    let userProfileForm = dce({el: 'FORM', attrbs: [['name', 'napak-profile']]});
    let userNameTitle = dce({el: 'H3', cssClass: 'mb', content: 'User name '});
    let userName = dce({el: 'INPUT', cssClass: 'mb', attrbs: [['placeholder', 'user name'], ['name', 'username'], ['value', getAuth().currentUser.displayName ]]});
    let updateProfileButton = dce({el: 'BUTTON', cssClass: 'mb btn_small preferred', content: 'Update'});

    let errorMessage = dce({el: 'DIV', cssClass : 'error'});
    let successMessage = dce({el: 'DIV', cssClass : 'success', content: 'Profile updated. Take me '});
    let successMessageLink = dce({el: 'A', cssClass : 'text-link', content: 'back to the wall'});
    successMessageLink.addEventListener('click', () => {
      route('board');
    }, false);

    successMessage.appendChild(successMessageLink);

    let cancelButton = dce({el: 'BUTTON', cssClass: 'mb btn_small', content: 'cancel'});
    cancelButton.addEventListener('click', () => {route('board')}, false);

    let buttonContainer = dce({el: 'div', cssStyle: 'display: flex; justify-content: center;'});
    buttonContainer.append(cancelButton, updateProfileButton);
    userProfileForm.append(userNameTitle, userName, buttonContainer);

    loginFormContainer.append(userProfileForm);

    let todoContainer = dce({el: 'SECTION', cssClass: 'profile-form mt'});
    let todoTitle = dce({el: 'H3', cssClass: 'mb', content: 'TODO routes by board'});
    let todoList = dce({el: 'DIV', cssClass: 'todo-routes-list', content: 'Loading TODO routes...'});
    todoContainer.append(todoTitle, todoList);

    const footerNavi = new bottomNavi({options :  {
      list: {
        title: 'Climb',
        icon: 'climb',
        link: () => {route('board')}
        }
      }
    });

    profileContainer.append(loginFormContainer, todoContainer);

    container.append(profileContainer, footerNavi.render());

    let updateUserProfile = () => {
      updateProfile(getAuth().currentUser, {
        displayName: userName.value
      }).then(() => {
        user.name.displayName = userName.value;
        user.name = user.name; // touch user login to update OTC element
        loginFormContainer.appendChild(successMessage);
      }).catch((error) => {
        errorMessage.innerHMTL = error;
        loginFormContainer.appendChild(errorMessage);
      });
    }

    userProfileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      updateUserProfile();
      return;
    }, false);

    const renderTodosByBoard = (groups) => {
      todoList.innerHTML = '';

      const boardNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
      if(boardNames.length === 0) {
        todoList.textContent = 'No TODO routes yet.';
        return;
      }

      boardNames.forEach((boardName) => {
        const boardGroup = dce({el: 'DIV', cssClass: 'mb'});
        const boardTitle = dce({el: 'H3', content: `${boardName} (${groups[boardName].length})`});
        const routesList = dce({el: 'UL'});

        groups[boardName].forEach((routeItem) => {
          const routeLine = dce({el: 'LI', content: routeItem});
          routesList.append(routeLine);
        });

        boardGroup.append(boardTitle, routesList);
        todoList.append(boardGroup);
      });
    };

    const loadTodoRoutes = async () => {
      const currentUser = getAuth().currentUser;
      if(!currentUser) {
        todoList.textContent = 'No user logged in.';
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const todos = userSnap.exists() && Array.isArray(userSnap.data().todos)
          ? userSnap.data().todos
          : [];

        if(todos.length === 0) {
          todoList.textContent = 'No TODO routes yet.';
          return;
        }

        const uniqueRouteIds = [...new Set(
          todos
            .map((item) => item && item.routeId)
            .filter(Boolean)
        )];

        const routeSnaps = await Promise.all(
          uniqueRouteIds.map((routeId) => getDoc(doc(db, 'routes', routeId)))
        );

        const routesById = {};
        routeSnaps.forEach((snap) => {
          if(snap.exists()) {
            routesById[snap.id] = snap.data();
          }
        });

        const groupedByBoard = {};
        todos.forEach((todo) => {
          const routeId = todo && todo.routeId;
          if(!routeId) { return; }

          const routeData = routesById[routeId];
          const boardName = routeData && routeData.napakboard ? routeData.napakboard : 'Unknown board';
          const routeName = routeData && routeData.name ? routeData.name : `Missing route (${routeId})`;

          if(!groupedByBoard[boardName]) {
            groupedByBoard[boardName] = [];
          }

          groupedByBoard[boardName].push(routeName);
        });

        renderTodosByBoard(groupedByBoard);
      } catch(error) {
        console.error('Failed to load TODO routes in profile:', error);
        todoList.textContent = 'Failed to load TODO routes.';
      }
    };

    loadTodoRoutes();

    this.render = () => {
      return container
    }
  }
}

export default viewProfile;
