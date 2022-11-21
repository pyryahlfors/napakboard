import { dce } from '../shared/helpers.js';
import { globals } from '../shared/globals.js';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getFirestore, getDoc, onSnapshot, query, updateDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
 
import bottomNavi   from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js';

class viewHistory {
  constructor() {
    let tickPage = dce({el: 'DIV', cssClass: 'page-board'});

    let ticker = new statusTicker();

    let historyContainer = dce({el: 'DIV', cssStyle: 'overflow: auto'})

    let nakki = ( async () => {
      let berse = getAuth().currentUser.uid;
      console.log(berse)
      const docRef = doc(getFirestore(), "users", berse);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        let userTicks = docSnap.data().ticks;
          userTicks.forEach( route => { 
            let selectedRoute = globals.boardRoutes.find(({ id }) => id === route.routeId);
            console.log(selectedRoute)

          })
          } 
      else {
          console.log("No such document!");
      }
  })();


    // Get uer ticks 
    globals.boardRoutes.forEach( route => { 
      if( route.ticks && route.ticks.includes(getAuth().currentUser.uid) ) {
        let tickContainer = dce({el: 'DIV', cssClass: 'session-tick'});

        let tickGrade = dce({el: 'DIV', cssClass: 'tick-grade'});
        let gradeLegend = dce({el: 'DIV', cssClass: `grade-legend ${globals.difficulty[route.grade]}`, content: globals.grades.font[route.grade]})
        tickGrade.append(gradeLegend, document.createTextNode(route.name))
        tickContainer.append(tickGrade)
        /*
<div className="tick-grade">
        <div className={clsx('grade-legend', t.grade.difficultyColor)}>{t.grade.name}</div>
        <div className="capitalize">{t.ascentType}</div>
*/
        historyContainer.append(tickContainer)
      } 
    })

    const footerNavi = new bottomNavi({options :  {} });

    tickPage.append(ticker.render(), historyContainer, footerNavi.render());

    this.render = () => {
      return tickPage;
    }
  }
}

export default viewHistory;
