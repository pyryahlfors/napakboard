import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js';

export const AUTH_HINT_KEY = 'napak_auth_hint';

// Your web app's Firebase configuration
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

const handler = {
  get: (obj, prop) => { return obj[prop] },

  set: (obj, prop, value) => {
    obj[prop] = value;

    for(let i=0, j = user.storeObservers.length; i<j; i++) {
      if(user[user.storeObservers[i].key] === obj[prop]) {
        user.storeObservers[i].callback();
      }
    }
    return true
  }
}

let userObject = {
  storeObservers : [],
  name : {
    displayName: null,
    id: null
  },
  login : {
    // Use localStorage as a fast hint so returning users skip the login screen
    // on load. onAuthStateChanged confirms or clears this in the background.
    isLoggedIn : localStorage.getItem(AUTH_HINT_KEY) === '1',
  }
};

const user = new Proxy(userObject, handler);
// Expose this for debugging purposes
window.user = user;

export { user }
