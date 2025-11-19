import { dce } from '../shared/helpers.js';
import { user } from '../shared/user.js';
import { route } from '../shared/route.js';

import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'

class viewLogin {
  constructor() {

    let container = dce({el: 'DIV', cssClass: 'page-login'});
    let loginFormContainer = dce({el: 'SECTION', cssClass: 'login-form'});

    let logoHolder = dce({el: 'div', cssClass: 'logo-holder'});
    let napakLogo = dce({el: 'IMG', source: '/projects/napakboard/images/n_white_on_black.svg', cssStyle: 'width: 50%; max-width: 175px;'});
    let loginTitle = dce({el: 'h3', cssClass: 'mb', content: 'Login'});
    let loginForm = dce({el: 'FORM', attrbs: [['name', 'napak-login']]});
    let userEmail = dce({el: 'INPUT', attrbs: [['placeholder', 'email'], ['name', 'email'], ['autocomplete', 'username']]});
    let password = dce({el: 'INPUT', attrbs: [['placeholder', 'Password'], ['type', 'password'], ['name', 'pass'], ['autocomplete', 'current-password']]});
    let loginError = dce({el: 'DIV', cssClass : 'login-error'});
    let loginButton = dce({el: 'BUTTON', cssClass: 'mb btn_small preferred', content: 'Login'});
    let noAccount = dce({el: 'DIV', cssClass: 'mt ', content: 'No account? '});
    let createAccountLink = dce({el: 'A', cssClass: 'text-link', content: 'Create one!'});
    noAccount.appendChild(createAccountLink);
    createAccountLink.addEventListener('click', () => { route('signup'); }, false)

    let forgotPasswordContainer = dce({el: 'DIV', cssClass: 'mt mb'});
    let forgotPasswordLink = dce({el: 'A', cssClass: 'mb mt text-link', content: 'Forgot password'})
    forgotPasswordContainer.appendChild(forgotPasswordLink);

    forgotPasswordLink.addEventListener('click', ()=>{
      route('resetPassword');
    }, false)




    let doLogin = () => {
      signInWithEmailAndPassword(getAuth(app), userEmail.value, password.value)
        .then(function(result) {
          user.login.isLoggedIn = true;
          user.name.id = result.user.uid;
          user.name.displayName = result.user.displayName;
          user.login = user.login;
        })
          // result.user.tenantId sho
        .catch(function(error) {
        // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          if (errorCode === 'auth/wrong-password') {
            loginError.innerHTML = "Wrong password";
          } else {
            loginError.innerHTML = errorMessage; //body.error.message.replace(/_/g, " ");
          }
          console.log(error);
          });
    }

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      doLogin();
    }, false)

    loginForm.append(userEmail, password, loginError, loginButton)
    loginFormContainer.append(loginTitle, loginForm, noAccount, forgotPasswordContainer);

    logoHolder.append(napakLogo);
    container.append(logoHolder, loginFormContainer);

    this.render = () => {
      return container
    }
  }
}

export default viewLogin;
