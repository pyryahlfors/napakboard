import { dce, storeObserver } from '../shared/helpers.js';

import systemBoard  from '../components/system_board/system_board.js';
import bottomNavi   from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js';
import { globals } from '../shared/globals.js';

class viewBoard {
  constructor() {
    let tickPage = dce({el: 'DIV', cssClass: 'page-board'});

    let ticker = new statusTicker();

    let mySystemBoard = new systemBoard();
    window.mySystemBoard = mySystemBoard;

	let footerNavi = new bottomNavi({options : {
		save: {
			title: 'save',
			icon: 'save',
			disabled: !!globals.selectedRouteId,
			link: () => {mySystemBoard.save()}
			},
		tick: {
			title: 'tick',
			icon: 'tick',
			disabled: !globals.selectedRouteId,
			link: () => {mySystemBoard.tick()}
			},
		clear: {
			title: 'clear',
			icon: 'clear',
			link: () => {mySystemBoard.clear()}
			},
		light: {
			title: 'light up',
			icon: 'light',
			selected: globals.lightsOn,
			link: () => {
				globals.lightsOn =! globals.lightsOn;
				footerNavi.toggle('light', globals.lightsOn);
				}
			},
		}
	});

	storeObserver.add({
		store: globals,
		key: 'selectedRouteId',
		id: 'pageBoardSaveDisable',
		callback: () => {
			const hasSaveDisabled = !!globals.selectedRouteId;
			const hasTickDisabled = !globals.selectedRouteId;
			footerNavi.setDisabled('save', hasSaveDisabled);
			footerNavi.setDisabled('tick', hasTickDisabled);
		}
	});

    tickPage.append(ticker.render(), mySystemBoard.render(), footerNavi.render());
    mySystemBoard.getHoldSetup();

    this.render = () => {
      return tickPage;
    }
  }
}

export default viewBoard;
