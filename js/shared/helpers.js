import { globals } from './globals.js';

let storeObserver = {
  add: (params) => {
    if (!params.store || !params.store.storeObservers) {
      console.error("Invalid store or storeObservers");
      return;
    }

    let store = params.store;

    // Use a for loop to avoid mutation issues
    for (let i = store.storeObservers.length - 1; i >= 0; i--) {
      if (params.id && store.storeObservers[i].id === params.id) {
        store.storeObservers.splice(i, 1);
      }
    }

    store.storeObservers.push({
      key: params.key,
      id: params.id,
      callback: params.callback,
      removeOnRouteChange: params.removeOnRouteChange
    });
  },

  remove: (params) => {
    if (!params.store || !params.store.storeObservers) {
      console.error("Invalid store or storeObservers");
      return;
    }

    let store = params.store;

    // Use a for loop to avoid mutation issues
    for (let i = store.storeObservers.length - 1; i >= 0; i--) {
      if (params.id && store.storeObservers[i].id === params.id) {
        store.storeObservers.splice(i, 1);
      }
    }
  },

  clear: (storeObservers) => {
    if (!storeObservers) {
      // nothing to clear
      return;
    }

    let remove = [];
    for (let i = 0; i < storeObservers.length; i++) {
      if (storeObservers[i].removeOnRouteChange) {
        remove.push(i);
      }
    }

    // Remove in reverse order to avoid index issues
    for (let i = remove.length - 1; i >= 0; i--) {
      storeObservers.splice(remove[i], 1);
    }
  }
};

// Create DOM element
let dce = (params) => {
  let element = document.createElement(params.el);

  if( params.cssClass )   { element.className = params.cssClass; }
  if( params.source )     { element.setAttribute('src', params.source);}
  if( params.cssStyle )   { element.setAttribute('style', params.cssStyle); }
  if( params.id )         { element.setAttribute('id', params.id); }
  if(params.content )     { element.appendChild(document.createTextNode(params.content)); }
  if( params.attrbs ) {
    for (let i = 0, j = params.attrbs.length; i < j; i++) {
      element.setAttribute(params.attrbs[i][0], params.attrbs[i][1]);
    }
  }
  return element;
}

// Create SVG element
let svg = (params) => {
  let xlmns = 'http://www.w3.org/2000/svg';
  let element = document.createElementNS(xlmns, params.el);

  if (params.cssClass) { element.className = params.cssClass; }
  if (params.cssStyle) { element.setAttribute('style', params.cssStyle);}
  if (params.id) { element.setAttribute('id', params.id); }
  if (params.attrbs) {
    for (let i = 0, j = params.attrbs.length; i < j; i++) {
      element.setAttributeNS(null, params.attrbs[i][0], params.attrbs[i][1]);
    }
  }
  return element;
}

// Parse date
let parseDate = (d) => {
  let parsed = d.split("-");
  return {
    year: parsed[0],
    month: parsed[1],
    date : parsed[2]
  }
}

// Custom events
let triggerCustomEvent = (params) => {
  let vent = new CustomEvent(params.vent, params.data);
  if (params.dispatch) {
    document.dispatchEvent(vent);
  }
}

let eightaNuScore = (data) => {
  let score = 0;
  let bonusgrade = 0;
  let ontop = 0;

  if (data.ascentType === 'flash') {
    bonusgrade = 1;
    ontop = 3;
  }

  let grade = Number(data.grade) + bonusgrade;
  score = (grade + ((grade >= 5) ? 3 : 1)) * 50 + ontop;
  return score;
}



export {
  storeObserver,
  dce,
  svg,
  triggerCustomEvent,
  parseDate,
  eightaNuScore
}
