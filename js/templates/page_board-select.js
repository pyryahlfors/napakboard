import { dce } from '../shared/helpers.js';
import { globals } from '../shared/globals.js';
import { collection, getFirestore, onSnapshot, query } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { route } from '../shared/route.js';

import bottomNavi   from '../components/bottom_navi/bottom_navi.js';

class viewBoardSelect {
  constructor() {

	let container = dce({el: 'DIV', cssClass: 'page-boardselect'});
    let selectContainer = dce({el: 'DIV', cssClass: 'boards-container'});
	let boardSelectContainer = dce({el: 'SECTION', cssClass: 'board-select-form'});


	let boards = [];
	const dbQuery = query(collection(getFirestore(), 'boardSetup'));
	onSnapshot(dbQuery, (querySnapshot) => {
		querySnapshot.forEach((doc) => {
			boards.push(doc.id);
		});

		for (let i=0; i<boards.length; i++) {
			let boardButton = dce({el: 'BUTTON', cssClass: `mb btn_small ${globals.board === boards[i] ? 'preferred' : null}`, content: boards[i]});
			boardButton.addEventListener('click', async () => {
				globals.board = boards[i];
				localStorage.setItem('board', globals.board);
				route('board');

			}, false);
			boardSelectContainer.appendChild(boardButton);
		}
	});

	const footerNavi = new bottomNavi({options :  {
      list: {
        title: 'Climb',
        icon: 'climb',
        link: () => {route('board')}
        }
      }
    });


	selectContainer.appendChild(boardSelectContainer);
	container.append(selectContainer, footerNavi.render());

	this.render = () => {
      return container
    }
  }
}

export default viewBoardSelect;
