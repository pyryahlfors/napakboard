import { dce, eightaNuScore } from '../shared/helpers.js';
import { globals } from '../shared/globals.js';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getFirestore, getDoc, onSnapshot, query, updateDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
 
import bottomNavi   from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js';

import { route } from '../shared/route.js';
import dsLegend from '../components/ds-legend/index.js';

class viewHistory {
  constructor() {
    let tickPage = dce({el: 'DIV', cssClass: 'page-history'});

    let ticker = new statusTicker();

    let historyContainer = dce({el: 'DIV', cssClass: 'history-container'})

    let nakki = ( async () => {
      let userScore = 0;
      let routeCount = 0;
      let userID = getAuth().currentUser.uid;
      const docRef = doc(getFirestore(), "users", userID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        let userTicks = docSnap.data().ticks;
        let tempContainer = document.createDocumentFragment();
        userTicks.forEach( route => { 
          let selectedRoute = globals.boardRoutes.find(({ id }) => id === route.routeId);
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
        })

        let historyTitle = dce({el: 'H2', content: 'History'});
        historyContainer.append(historyTitle)
        historyContainer.append(document.createTextNode(`User score: `), dce({el: 'h3', cssClass: 'inline bold', content: userScore}));
        
        historyContainer.append(document.createElement('br'));
        historyContainer.append(document.createTextNode(`Total routes climbed: `), dce({el: 'h3', cssClass: 'inline bold', content: routeCount}));
        historyContainer.append(document.createElement('br'));
        historyContainer.append(document.createTextNode(`Routes:`));
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

    tickPage.append(ticker.render(), historyContainer, footerNavi.render());

    this.render = () => {
      return tickPage;
    }
  }
}

export default viewHistory;
