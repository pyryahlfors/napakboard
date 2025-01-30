import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js';

// Your web app's Firebase configuration
const firebaseConfig = {
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

let userFromStorage = getAuth().currentUser || {};
let userObject = {
  storeObservers : [],
  name : {
    displayName: userFromStorage.displayName,
    id:  userFromStorage.uid
  },

  login : {
    isLoggedIn : userFromStorage.uid ? true : false,
  }
};

const user = new Proxy(userObject, handler);
// Expose this for debugging purposes
window.user = user;

export { user }
