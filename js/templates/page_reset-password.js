import { dce } from '../shared/helpers.js';
import { user } from '../shared/user.js';
import { route } from '../shared/route.js';
import { getAuth, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'


class viewResetPassword {
  constructor() {

    let container = dce({el: 'DIV', cssClass: 'page-login'});
    let resetFormContainer = dce({el: 'SECTION', cssClass: 'reset-form'});

    let logoHolder = dce({el: 'div', cssClass: 'logo-holder'});
    let napakLogo = dce({el: 'IMG', source: 'images/n_white_on_black.svg', cssStyle: 'width: 50%; max-width: 175px;'});


    let pageTitle = dce({el: 'h3', cssClass: 'mb', content: 'Forgot password'});
    let resetForm = dce({el: 'FORM', attrbs: [['name', 'napak-login']]});
    let userEmail = dce({el: 'INPUT', attrbs: [['placeholder', 'email'], ['name', 'email']]});

    let resetSuccess = dce({el: 'DIV', cssClass : 'api-message-success'});
    let resetError = dce({el: 'DIV', cssClass : 'api-message-error'});
    let resetButton = dce({el: 'BUTTON', cssClass: 'mb btn_small preferred', content: 'RESET'});

    let goBack = dce({el: 'DIV', cssClass: 'mb mt', content: 'Go back to '});
    let goBackLink = dce({el: 'A', cssClass: 'text-link', content: 'login page', attrbs: [['href', '#perse']]});
    goBack.appendChild(goBackLink);

    goBackLink.addEventListener('click', ()=>{
      route('login');
//      document.location = '';
    }, false)


    let resetPassword = () => {
      var emailAddress = userEmail.value;
      sendPasswordResetEmail(getAuth(), emailAddress).then(function() {
        resetSuccess.innerHTML = 'Email sent. Follow the directions in the email to reset your password'
      }).catch(function(error) {
        resetError.innerHTML = error.code + " " + error.message;
      });
    }

    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetPassword();
      return;
    }, false)


    resetForm.append(userEmail, resetError, resetSuccess, resetButton, goBack)
    resetFormContainer.append(pageTitle, resetForm);

    logoHolder.append(napakLogo);

    container.append(logoHolder, resetFormContainer);

    this.render = () => {
      return container
    }
  }
}

export default viewResetPassword;
