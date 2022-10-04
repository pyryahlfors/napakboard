import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";  
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js'

const handler = {
  get: (obj, prop) => {
    return obj[prop];
  },

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

const firebaseConfig = {
  apiKey: "AIzaSyCIKa0tKpjQhPynVjNO3sehFmJrGqocyLA",
  authDomain: "napak-board.firebaseapp.com",
  projectId: "napak-board",
  storageBucket: "napak-board.appspot.com",
  messagingSenderId: "809734457516",
  appId: "1:809734457516:web:adfea8fe6a0ac8c9983709"
};
const app = initializeApp(firebaseConfig);


let userFromStorage = getAuth().currentUser || {};

let userObject = {
  storeObservers : [],
  name : {
    displayName: userFromStorage.displayName,
    email:  userFromStorage.email,
    id:  userFromStorage.id
  },

  login : {
    isLoggedIn : userFromStorage.isLoggedIn,
  }
};

const user = new Proxy(userObject, handler);
// Expose this for debugging purposes
window.user = user;

export { user }
