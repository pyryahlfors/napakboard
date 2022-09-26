import { dce } from '/js/shared/helpers.js';
import { globals } from '/js/shared/globals.js';
 
import systemBoard  from '/js/components/system_board/system_board.js';
import bottomNavi   from '/js/components/bottom_navi/bottom_navi.js';

class viewBoard {
  constructor() {
    let tickPage = dce({el: 'DIV', cssClass: 'page-tick'});

    let mySystemBoard = new systemBoard({width: 11, height: 21});
    tickPage.append(mySystemBoard.render());
    mySystemBoard.getHoldSetup();

    const footerNavi = new bottomNavi({options : {
      level1: [['list', () => {mySystemBoard.list()}], ['save', () => {mySystemBoard.save()}], ['clear', () => {mySystemBoard.clear()}]],
      }
    });
    tickPage.appendChild(footerNavi.render());

    this.render = () => {
      return tickPage;
    }
  }
}

export default viewBoard;
