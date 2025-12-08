import { dce, eightaNuScore } from '../shared/helpers.js';
import { globals } from '../shared/globals.js';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getFirestore, getDoc, onSnapshot, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'

import bottomNavi   from '../components/bottom_navi/bottom_navi.js';

import { route } from '../shared/route.js';
import dsLegend from '../components/ds-legend/index.js';

class viewHistory {
  constructor() {
    let tickPage = dce({el: 'DIV', cssClass: 'page-history'});


    let historyContainer = dce({el: 'DIV', cssClass: 'history-container'})

    let nakki = ( async () => {
		let routes = [];
		const dbQuery = query(
			collection(getFirestore(), 'routes'),
			where('napakboard', '==', globals.board));

		onSnapshot(dbQuery, (querySnapshot) => {
			querySnapshot.forEach((doc) => {
				let routeData = doc.data();
				routeData.id = doc.id;
				routes.push(routeData);
			});
		});

		let userScore = 0;
		let routeCount = 0;
		let userID = getAuth().currentUser.uid;
		const docRef = doc(getFirestore(), "users", userID);
		const docSnap = await getDoc(docRef);


		if (docSnap.exists() && docSnap.data()?.ticks) {
		  let userTicks = docSnap.data().ticks.reverse();
		  let tempContainer = document.createDocumentFragment();

		  let boardName= dce({el: 'h4', cssStyle: 'text-align: center; border-bottom: 1px solid #fff; width: 100%; margin-bottom: 0.5rem; padding-bottom: 0.5rem;', content: `Climbed routes`});
		  tempContainer.appendChild(boardName);

		  let currentDate = null;
		  userTicks.forEach( route => {
			let selectedRoute = routes.find(({ id }) => id === route.routeId);
			if(selectedRoute && selectedRoute.napakboard === globals.board) {
				if(route.date && new Date(route.date).toLocaleDateString() !== new Date(currentDate).toLocaleDateString()) {
				let dateEl = dce({el: 'h3', cssClass: 'mt mb', cssStyle: 'padding: 2px 8px; background: rgba(255,255,255,.2); border-radius: 2px;', content: new Date(route.date).toLocaleDateString("us-EN", {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})});
				tempContainer.appendChild(dateEl);
				currentDate = route.date;
				}

				if(!route.date && currentDate) {
				let dateEl = dce({el: 'h3', cssClass: 'mt mb', cssStyle: 'padding: 2px 8px; background: rgba(255,255,255,.2); border-radius: 2px;', content: 'No date'});
				tempContainer.appendChild(dateEl);
				currentDate = null
				}


				if(selectedRoute) {
				let routeScore = eightaNuScore({ascentType: route.type, grade: selectedRoute.grade});
				userScore+=routeScore;
				routeCount+=1;

				let tickContainer = dce({el: 'DIV', cssClass: 'session-tick'});

				let gradeLegend = new dsLegend({title: globals.grades.font[selectedRoute.grade], type: 'grade', cssClass: globals.difficulty[selectedRoute.grade]})
				let routeName = dce({el: 'DIV', cssClass: `tick-routename`, content: selectedRoute.name})
				let ascentType = dce({el: 'DIV', cssClass: `tick-ascenttype`})
				let ascentLegend = new dsLegend({title: route.type, type: 'ascent', cssClass: route.type})
				ascentType.appendChild(ascentLegend)
				let tickScore = dce({el: 'DIV', cssClass: `tick-ascentscore`, content: routeScore})
				tickContainer.append(gradeLegend, routeName, ascentType, tickScore);

				tempContainer.append(tickContainer)
				}
			}
		  })

		  let historyTitle = dce({el: 'H2', content: 'History'});
		  historyContainer.append(historyTitle)
		  historyContainer.append(document.createTextNode(`User score: `), dce({el: 'h3', cssClass: 'inline bold', content: userScore}));

		  historyContainer.append(document.createElement('br'));
		  historyContainer.append(document.createTextNode(`Total routes climbed: `), dce({el: 'h3', cssClass: 'inline bold', content: routeCount}));
		  historyContainer.append(tempContainer)
		  }
		else {
		  console.log("No such document!");
		}
  })();


    const footerNavi = new bottomNavi({options :  {
      list: {
        title: 'Climb',
        icon: 'climb',
        link: () => {route('board')}
        }
    } });

    tickPage.append(historyContainer, footerNavi.render());

    this.render = () => {
      return tickPage;
    }
  }
}

export default viewHistory;
