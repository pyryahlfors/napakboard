import { dce } from '../shared/helpers.js';
 
import systemBoard  from '../components/system_board/system_board.js';
import bottomNavi   from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js';

class viewBoard {
  constructor() {
    let tickPage = dce({el: 'DIV', cssClass: 'page-tick'});

    let ticker = new statusTicker();

    let mySystemBoard = new systemBoard({width: 11, height: 21});

    const footerNavi = new bottomNavi({options : {
      level1: [['list', () => {mySystemBoard.list()}], ['save', () => {mySystemBoard.save()}], ['clear', () => {mySystemBoard.clear()}]],
      }
    });

    tickPage.append(ticker.render(), mySystemBoard.render(),footerNavi.render());
    mySystemBoard.getHoldSetup();

    this.render = () => {
      return tickPage;
    }
  }
}

export default viewBoard;
