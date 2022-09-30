import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";  
import { getFirestore, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'

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

const fbApp = initializeApp(firebaseConfig);

const db = getFirestore();

const store = {
  write: function(params){
  },

  add: function(params){
  },

  remove: function(params){
  },

  read: function(params){
    if(params.collection && !params.document) {
      let returnObject = {}
      let readCollection = collection(db, params.collection);
      return getDocs(readCollection).then((snapshot) => {console.log(snapshot.docs)})
    }
    else if (params.collection && params.document ) {
      collection(params.collection).doc(params.document).get().then((doc) => {
        if (doc.exists) {
          return doc
        }
        else return {error: 'could not find document'}
      });
    }
  }
}

export { store };
