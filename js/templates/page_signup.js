import { dce } from '../shared/helpers.js';
import { user } from '../shared/user.js';
import { route } from '../shared/route.js';

import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

class viewSignup {
  constructor() {

    let container = dce({el: 'DIV', cssClass: 'page-signup'});
    let signupFormContainer = dce({el: 'SECTION', cssClass: 'signup-form'});

    let logoHolder = dce({el: 'div', cssClass: 'logo-holder'});
    let napakLogo = dce({el: 'IMG', source: 'napakboard/images/n_white_on_black.svg', cssStyle: 'width: 50%; max-width: 175px;'});

    let newAccount = dce({el: 'h3', cssClass: 'mb', content: 'Create new account'});
    let signupForm = dce({el: 'FORM', attrbs: [['name', 'napak-login']]});
    let userEmail = dce({el: 'INPUT', attrbs: [['placeholder', 'email'], ['name', 'email']]});
    let password = dce({el: 'INPUT', attrbs: [['placeholder', 'Password'], ['type', 'password'], ['name', 'pass']]});
    let passwordAgain = dce({el: 'INPUT', attrbs: [['placeholder', 'Password again'], ['type', 'password'], ['name', 'passagain']]});
    let signupError = dce({el: 'DIV', cssClass : 'api-message-error'});
    let signupButton = dce({el: 'BUTTON', cssClass: 'mb btn_small preferred', content: 'Create account'});
    let goBack = dce({el: 'DIV', cssClass: 'mb mt', content: 'Go back to '});
    let goBackLink = dce({el: 'A', cssClass: 'text-link', content: 'login page', attrbs: [['href', '#']]});
    goBack.appendChild(goBackLink);

    goBackLink.addEventListener('click', ()=>{
      document.location = '';
    }, false)

    let doSignup = () => {
      if(password.value !== passwordAgain.value) {
        signupError.innerHTML = "PASSWORDS MISMATCH";
        return;
      }

      createUserWithEmailAndPassword(getAuth(), userEmail.value, password.value)
        .then((userCredential) => {
          user.name.email = userCredential.user.email;
          user.name.id = userCredential.user.uid;
          user.name.displayName = 'Anonymous';

          ( async () => {
            await setDoc(doc(getFirestore(), "users", user.name.id), {
              email: user.name.email,
            });
            alert('new user added. You can now log in');
            document.location = '';
        })();
      })
      .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          signupError.innerHTML = "<p>" + error.message + "</p>";
          // ..
      });
  }

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      doSignup();
      return;
    }, false);

    signupForm.append(userEmail, password, passwordAgain, signupError, signupButton);

    signupFormContainer.append(newAccount, signupForm, goBack);

    logoHolder.append(napakLogo);

    container.append(logoHolder,signupFormContainer);

    this.render = () => {
      return container
    }
  }
}

export default viewSignup;
