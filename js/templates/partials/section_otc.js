import { dce, storeObserver } from '../../shared/helpers.js';
//import toggleSwitch from '/js/components/toggleswitch.js';
import { route } from '../../shared/route.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { user } from '../../shared/user.js';

class otc {
  constructor() {
    let container = dce({el: 'DIV', cssClass: 'otc-navigation'});

    let otcLinksContainer = dce({el: 'DIV', cssClass: 'otc-links-container'});

    let loginInfo = dce({el: 'DIV', cssClass: 'login-info'});

    let userName = getAuth().currentUser ?  getAuth().currentUser.displayName : false;
    let loginInfoTitle = dce({el: 'H3', cssClass: 'mt mb username', content: `Logged in as ${userName} 😻`});
    let logoutButton = dce({el: 'A', cssClass: 'btn login-link', content: 'Logout'});
    loginInfo.appendChild(loginInfoTitle)

    let updateProfile = dce({el: 'h3', cssClass: 'hidden', content: 'What kind of user name is that? '});
    let updateProfileLink = dce({el: 'A', cssClass: 'text-link', content: 'Update your profile'});
    updateProfileLink.addEventListener('click', ()=>{
      route('profile');
    }, false);

    if(!userName) {updateProfile.classList.remove('hidden'); }
    updateProfile.appendChild(updateProfileLink);
    loginInfo.appendChild(updateProfile);

    loginInfo.appendChild(logoutButton);

    logoutButton.addEventListener('click', () => {
      getAuth().signOut().then(function() {
        document.body.classList.remove('otc')
        route('login')
        }, function(error) {
        // An error happened.
      });      
    }, false)

    // Listen and update details when login/logout. This is retarded. Fix it at some point
    let loginStatus = () => {
      let userName = getAuth().currentUser.displayName;
      loginInfo.querySelector('H3.username').innerHTML = `Logged in as ${userName} 😻`;
      if(!userName) { updateProfile.classList.remove('hidden'); }
      else { updateProfile.classList.add('hidden'); }
    }
    
    
    storeObserver.add({
      store: user,
      key: 'login',
      id: 'userLogin',
      callback: loginStatus
    });

    storeObserver.add({
      store: user,
      key: 'name',
      id: 'userDetails',
      callback: loginStatus
    });

    let sideNavLinks = dce({el: 'SECTION', cssClass: 'sidenav-links'});

    let btnProfile = dce({el: 'A', content: 'Profile' });
    let btnHistory = dce({el: 'A', content: 'History' });
    let btnBoard = dce({el: 'A', content: 'Board'})

    btnProfile.addEventListener('click', () => {
      route('profile');
      document.body.classList.remove('otc')
    }, false);

    btnHistory.addEventListener('click', () => {
      route('history');
      document.body.classList.remove('otc')
    }, false);

    btnBoard.addEventListener('click', () => {
      route('board');
      document.body.classList.remove('otc')
    }, false);

    sideNavLinks.append(btnProfile, btnHistory, btnBoard);

    otcLinksContainer.append(loginInfo, sideNavLinks);

    container.append(otcLinksContainer);

    this.render = () => {
      return container
    }
  }
}

export default otc;
