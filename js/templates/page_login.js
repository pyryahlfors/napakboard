import { dce } from '../shared/helpers.js';
 import dsButton     from '../components/ds-button/index.js';

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js'
import { globals } from '../shared/globals.js';
import { route } from '../shared/route.js';

class viewLogin {
  constructor() {
    let loginPage = dce({el: 'DIV', cssClass: 'page-login'});

    let loginContainer = dce({el: 'form', cssClass: 'login-form'});
    let pageTitle = dce({el: 'h3', content: 'Napak board - Login', cssClass: 'mb'});
    let userName = dce({el: 'input', attrbs: [['name', 'email'], ['placeholder', 'User name']]});
    let password = dce({el: 'input', attrbs: [['name', 'password'], ['placeholder', 'Password'], ["type", "password"]]});
    let loginBtn = new dsButton({
      title: 'Login', 
      cssClass: 'btn btn_small preferred', 
      thisOnClick: () => { login(userName.value, password.value) }
    });

    let visitorBtn = new dsButton({
      title: 'Visitor', 
      cssClass: 'btn btn_small mt', 
      thisOnClick: () => { 
        globals.user = {dummy: true};
        route('board') }
    });

    
    loginContainer.append(pageTitle, userName, password, loginBtn, visitorBtn)

    const auth = getAuth();
    // Allready signed in
    auth.onAuthStateChanged(function(user) {
      if (user) {
        globals.user = user;
      } 
    });

    const login = (email, password ) => {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in 
          const user = userCredential.user;
          globals.user = user;
          // ...
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
        });
    }

    loginPage.append(loginContainer);

    this.render = () => {
      return loginPage;
    }
  }
}

export default viewLogin;
