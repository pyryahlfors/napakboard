import { globals } from './globals.js';

let storeObserver = { 
  add : ( params ) => {
    let store = params.store;

    // remove existing observer if it has some ID
    store.storeObservers.forEach((o, count) => {
      if(params.id && o.id === params.id) {
        store.storeObservers.splice(count, 1)
      }
    });

    store.storeObservers.push({
      key: params.key,
      id: params.id,
      callback: params.callback,
      removeOnRouteChange: params.removeOnRouteChange
    });
  },

  remove: ( id ) => {
    console.log(id);
  },

  clear: () => {
    let remove = [];
    globals.storeObservers.forEach( (o, count) => {
      if(o.removeOnRouteChange) {
        remove.push(count)
       }
    });

    remove.slice().reverse().forEach((c)=>{
      globals.storeObservers.splice(c, 1)
    });
  }
};

// Create DOM element
let dce = (params) => {
  let element = document.createElement(params.el);

  if (params.cssClass) {
    element.className = params.cssClass;
  }

  if (params.source) {
    element.setAttribute('src', params.source);
  }

  if (params.cssStyle) {
    element.setAttribute('style', params.cssStyle);
  }

  if (params.id) {
    element.setAttribute('id', params.id);
  }

  if (params.content) {
    element.appendChild(document.createTextNode(params.content));
  }

  if (params.attrbs) {
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

  if (params.cssClass) {
    element.className = params.cssClass;
  }

  if (params.cssStyle) {
    element.setAttribute('style', params.cssStyle);
  }

  if (params.id) {
    element.setAttribute('id', params.id);
  }

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



export {
  storeObserver,
  dce,
  svg,
  triggerCustomEvent,
  parseDate
}
