//  Defaults
const handler = {
  get: (obj, prop) => {
    return obj[prop];
  },

  set: (obj, prop, value) => {
    obj[prop] = value;
    
    for(let i=0, j = globals.storeObservers.length; i<j; i++) {
      if(globals[globals.storeObservers[i].key] === obj[prop]) {
        globals.storeObservers[i].callback();
      }
    }
    return true
  }
}

/*
  Globals
*/

let globalObjects = {
  routes: {},
  storeObservers : [],

  grades : {
    font: ["3", "4", "4+", "5", "5+", "6A", "6A+", "6B", "6B+", "6C", "6C+", "7A", "7A+", "7B", "7B+", "7C", "7C+", "8A", "8A+", "8B", "8B+", "8C", "8C+", "9A"],
  },

  serverMessage :[] ,
  standardMessage: []
};

const globals = new Proxy(globalObjects, handler);

// Expose this for debugging purposes
window.globals = globals;

export { globals }
