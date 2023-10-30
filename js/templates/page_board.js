import { dce } from '../shared/helpers.js';
 
import systemBoard  from '../components/system_board/system_board.js';
import bottomNavi   from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js';
import { globals } from '../shared/globals.js';

class viewBoard {
  constructor() {
    let tickPage = dce({el: 'DIV', cssClass: 'page-board'});

    let ticker = new statusTicker();

    let mySystemBoard = new systemBoard();

    const footerNavi = new bottomNavi({options : 
        {
          list: { 
            title: 'list',
            icon: 'list',
            link: () => {mySystemBoard.list()}
            },
          save: { 
            title: 'save',
            icon: 'save',
            link: () => {mySystemBoard.save()}
            },
          clear: { 
            title: 'clear',
            icon: 'clear',
            link: () => {mySystemBoard.clear()}
            },
          tick: { 
            title: 'tick',
            icon: 'tick',
            link: () => {mySystemBoard.tick()}
            },
          light: { 
            title: 'light up',
            icon: 'light',
            link: () => {
              globals.lightsOn =! globals.lightsOn;
              footerNavi.toggle('light', globals.lightsOn);
              }
            },
          }
    });

    tickPage.append(ticker.render(), mySystemBoard.render(),footerNavi.render());
    mySystemBoard.getHoldSetup();
    window.mySystemBoard = mySystemBoard;

    this.render = () => {
      return tickPage;
    }
  }
}

export default viewBoard;
