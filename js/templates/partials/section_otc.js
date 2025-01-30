import { dce, storeObserver } from '../../shared/helpers.js';
//import toggleSwitch from '/js/components/toggleswitch.js';
import { route } from '../../shared/route.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { user } from '../../shared/user.js';

class otc {
  constructor() {
    let container = dce({el: 'DIV', cssClass: 'otc-navigation'});

    let otcLinksContainer = dce({el: 'DIV', cssClass: 'otc-links-container'});

    let loginInfo = dce({el: 'DIV', cssClass: 'login-info mb'});

    let userName = getAuth().currentUser ?  getAuth().currentUser.displayName : false;
    let loginInfoTitle = dce({el: 'H3', cssClass: 'mt mb username', content: `Logged in as ${userName} 😻`});

    let updateProfile = dce({el: 'h3', cssClass: `mb mt ${!userName ? null : 'hidden'}`, content: 'What kind of user name is that? Go change it'});

    loginInfo.append(loginInfoTitle, updateProfile)

    let profileButton = dce({el: 'A', cssClass: 'btn btn_small', content: 'Profile'});
    profileButton.addEventListener('click', () => {
      route('profile');
      document.body.classList.remove('otc')
    }, false);


    let logoutButton = dce({el: 'A', cssClass: 'btn btn_small preferred', content: 'Logout'});

    let buttonsContainer = dce({el: 'DIV', cssStyle: 'display: flex; justify-content: space-between'});
    buttonsContainer.append(profileButton, logoutButton);
    loginInfo.append(buttonsContainer);

    logoutButton.addEventListener('click', () => {
      getAuth().signOut().then(function() {
        document.body.classList.remove('otc')
        route('login')
        }, function(error) {
        // An error happened.
      });
    }, false)

    // Listen and update details when login/logout. 
    let loginStatus = () => {
      let userName = getAuth().currentUser.displayName;
      loginInfo.querySelector('H3.username').innerHTML = `Logged in as ${userName} 😻`;
      updateProfile.classList.add('hidden');
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

    let tempContainer = dce({el: 'DIV', cssStyle: 'display: flex; flex-direction: column'});
    let sideNavLinks = dce({el: 'SECTION', cssClass: 'sidenav-links'});

    let btnHistory = dce({el: 'A', content: 'History' });

    btnHistory.addEventListener('click', () => {
      route('history');
      document.body.classList.remove('otc')
    }, false);

  sideNavLinks.append(btnHistory);

  otcLinksContainer.append(sideNavLinks);
  tempContainer.append(loginInfo, otcLinksContainer)


  container.append(tempContainer);

    this.render = () => {
      return container
    }
  }
}

export default otc;
