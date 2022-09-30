import { dce } from '../shared/helpers.js';
 
import bottomNavi   from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js';
import { user } from '../shared/user.js';

class viewLogin {
  constructor() {
    let loginPage = dce({el: 'DIV', cssClass: 'page-login'});

    let ticker = new statusTicker();

    let loginContainer = dce({el: 'div'});
    let userName = dce({el: 'input', attrbs: [['name', 'username'], ['placeholder', 'User name']]});
    let password = dce({el: 'input', attrbs: [['name', 'password'], ['placeholder', 'Password'], ["type", "password"]]});

    loginContainer.append(userName, password)

    const footerNavi = new bottomNavi({options : {
      level1: [['list', () => {mySystemBoard.list()}], ['save', () => {mySystemBoard.save()}], ['clear', () => {mySystemBoard.clear()}]],
      }
    });

    loginPage.append(ticker.render(), loginContainer, footerNavi.render());

    this.render = () => {
      return loginPage;
    }
  }
}

export default viewLogin;
