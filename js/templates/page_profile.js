import { dce } from '../shared/helpers.js';
import { user } from '../shared/user.js';
import { route } from '../shared/route.js';

import { getAuth, updateProfile } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js'

class viewProfile {
  constructor() {

    document.body.classList.remove('otc');
    let container = dce({el: 'DIV', cssClass: 'page-profile'});
    let loginFormContainer = dce({el: 'SECTION', cssClass: 'profile-form'});

    let userProfileForm = dce({el: 'FORM', attrbs: [['name', 'napak-profile']]});
    let userNameTitle = dce({el: 'H3', cssClass: 'mb', content: 'User name: '});
    let userName = dce({el: 'INPUT', attrbs: [['placeholder', 'user name'], ['name', 'username'], ['value', getAuth().currentUser.displayName ]]});
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

    container.append(loginFormContainer);

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
    
    this.render = () => {
      return container
    }
  }
}

export default viewProfile;