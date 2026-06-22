import { dce } from '../shared/helpers.js';

import systemBoard  from '../components/board_setup/board_setup.js';
import bottomNavi   from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js';
import { globals } from '../shared/globals.js';
import { route } from '../shared/route.js';

class viewSetup {
  constructor() {
    let setupPage = dce({el: 'DIV', cssClass: 'page-board'});

    let ticker = new statusTicker();

    let mySystemBoard = new systemBoard();
    window.mySystemBoard = mySystemBoard;

	let footerNavi = new bottomNavi({options : {
	      list: {
    	    title: 'Climb',
        	icon: 'climb',
			link: () => {route('board')}
			},

		save: {
			title: 'Save',
			icon: 'save',
			link: () => {
				mySystemBoard.updateSetup(globals.board);
				}
			},

		console: {
			title: 'console',
			icon: 'list',
			link: () => {
				console.log(globals.boardSetup);
				}
			},
		nuke: {
			title: 'nukeDB',
			icon: 'clear',
			link: () => {
				mySystemBoard.nukeRoutes();
				}
			}

		}
	});

	setupPage.append(ticker.render(), mySystemBoard.render(),footerNavi.render());
    // Ensure hold images are ready (they're also loaded in loadBoardSetup)
    mySystemBoard.getHoldSetup().catch((error) => {
        console.warn('Hold setup refresh failed:', error);
    });

    this.render = () => {
      return setupPage;
    }
  }
}

export default viewSetup;
