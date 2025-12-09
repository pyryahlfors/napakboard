import { dce, storeObserver } from '../../shared/helpers.js';
import { animate } from '../../shared/animate.js';
import { globals } from '../../shared/globals.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'

import dsLegend from '../ds-legend/index.js';
import dsIcon from '../ds-icon/index.js';

class statusTicker {
  constructor(params) {
    let container = dce({el: 'DIV', cssClass: 'current status-ticker'});
    let messageContainer = dce({el: 'DIV', cssClass: 'status-ticker-content'});
    container.appendChild(messageContainer);

    const nextPrev = (dir) => {
      if(!globals.sortedRoutes.length) return;

      let selectedRouteOrder = globals.selectedRouteId ? globals.sortedRoutes.findIndex(route => { return route.id === globals.selectedRouteId; }) : 0;
      selectedRouteOrder += dir;
      if(selectedRouteOrder < 0) { selectedRouteOrder = globals.sortedRoutes.length - 1}
      if(selectedRouteOrder > globals.sortedRoutes.length - 1) { selectedRouteOrder = 0}
      window.mySystemBoard.loadRoute(globals.sortedRoutes[selectedRouteOrder].id)
    }

    let standardMessage = dce({el: 'DIV', cssClass: 'standard'});
    let standardMessageContent = dce({el: 'H3', content: ''});
    standardMessage.appendChild(standardMessageContent);
    messageContainer.appendChild(standardMessage);

    let currentTitle = dce({el: 'DIV', cssClass: 'current'});
	const prevButton = new dsIcon({icon: 'chevron-back', fill: '#fff', color: "#fff", width: 24, height: 24});

    prevButton.addEventListener('click', ()=>{nextPrev(-1)}, false);

    let currentTitleContent = dce({el: 'H3', cssStyle: 'display: flex; height: 100%; align-items: center;', content: globals.selectedRoute || 'No route selected'});

    currentTitleContent.addEventListener('click', () => {
      if(!window.mySystemBoard.list) { return }
      window.mySystemBoard.list();
    }, false);

	const nextButton = new dsIcon({icon: 'chevron-forward', fill: '#fff', color: "#fff", width: 24, height: 24});
    nextButton.addEventListener('click', ()=>{nextPrev(1)}, false);

    currentTitle.append(prevButton, currentTitleContent, nextButton);
    messageContainer.appendChild(currentTitle);

    storeObserver.add({
      store: globals,
      key: 'selectedRouteId',
      id: 'selectedRoute',
      callback: () => {
        let selectedRoute = globals.boardRoutes.find(({ id }) => id === globals.selectedRouteId);
        if(selectedRoute) {
          let climbed = selectedRoute.ticks && selectedRoute.ticks.includes(getAuth().currentUser.uid);
          currentTitleContent.innerHTML = `${selectedRoute.name}&nbsp;`
          let routeGrade = new dsLegend({title: globals.grades.font[selectedRoute.grade], type: 'grade', cssClass: globals.difficulty[selectedRoute.grade]})

          currentTitleContent.appendChild(routeGrade)

          if ( climbed ) {
            let climbedIcon = dce({el: 'SPAN', cssStyle: 'background: var(--color-theme-accent-1); color: var(--color-black); display: inline-block; width: 1.25em; height: 1.25em; border-radius: 100%; text-align: center;', content: '✔'});
            currentTitleContent.appendChild(climbedIcon)
          }
        }
        else {
          currentTitleContent.innerHTML = 'No route selected';
        }
      }
    });

    let serverMessage = dce({el: 'DIV', cssClass: 'network'});
    let serverMessageContent = dce({el: 'H3', content: ''});
    let blink = dce({el: 'SPAN', cssClass: 'spinner spin360'});
    serverMessage.append(serverMessageContent, blink);
    messageContainer.appendChild(serverMessage);

    // Listen for network messages
    let handleTicker = function() {
      if( globals.standardMessage.length ) {
        let tickerMessage = globals.standardMessage[globals.standardMessage.length-1];
        standardMessageContent.innerHTML = tickerMessage.message;
        container.classList.add('show-message', 'standard');
        container.classList.remove('from-bottom');

        if( tickerMessage.timeout ) {
          if( messageContainer.timeout ) { clearTimeout(messageContainer.timeout) }
          messageContainer.timeout = setTimeout(function() {
            animate.watch({
              el: messageContainer,
              execute: () => {
                globals.standardMessage.splice(globals.standardMessage.length-1,1);
                globals.standardMessage = globals.standardMessage;
               },
              unwatch: true
              });
            container.classList.remove('show-message', 'standard');
          },tickerMessage.timeout*1000);
        }
      }
      if( globals.serverMessage.length ) {
        let tickerMessage = globals.serverMessage[globals.serverMessage.length-1];

        serverMessageContent.innerHTML = tickerMessage.message;
        container.classList.add('show-message', 'network');
        container.classList.remove('standard');
        if( tickerMessage.timeout ) {
          if( messageContainer.timeout ) { clearTimeout(messageContainer.timeout) }
          messageContainer.timeout = setTimeout(function(){
            animate.watch({
              el: messageContainer,
              execute: () => {
                globals.serverMessage.splice(globals.serverMessage.length-1,1);
                globals.serverMessage = globals.serverMessage;
               },
              unwatch: true
              });
            container.classList.add('from-bottom');
            container.classList.remove('show-message', 'network');
          },1000);
        }
      }
    }.bind(this);

    storeObserver.add({
      store: globals,
      key: 'serverMessage',
      id: 'statusTickerServerMessage',
      callback: handleTicker
    });

    storeObserver.add({
      store: globals,
      key: 'standardMessage',
      id: 'statusTickerStandardMessage',
      callback: handleTicker
    });


    this.render = () => {
      return container;
    }
  }
}

export default statusTicker;
