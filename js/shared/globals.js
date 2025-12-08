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
  lightsOn: false,
  selectedRoute: null,
  routeSorting: 'date',
  boardRoutes: [],
  sortedRoutes: [],
  board: localStorage.getItem("board") || 'Kantti',
  boardAngle: Number(0),
  sortOrder: 'desc',

  boardSetupMode : document.location.search.substring(1) === 'setup',

  grades : {
    font: ["3", "4", "4+", "5", "5+", "6A", "6A+", "6B", "6B+", "6C", "6C+", "7A", "7A+", "7B", "7B+", "7C", "7C+", "8A", "8A+", "8B", "8B+", "8C", "8C+", "9A"],
  },

  difficulty : {
    0 : 'gray',
    1 : 'yellow',
    2 : 'yellow',
    3 : 'green',
    4 : 'green',
    5 : 'orange',
    6 : 'orange',
    7 : 'blue',
    8 : 'blue',
    9 : 'red',
    10 : 'red',
    11 : 'purple',
    12 : 'purple',
    13 : 'pink',
    14 : 'pink',
    15 : 'black',
    16 : 'black',
    17 : 'black',
    18 : 'black',
    19 : 'white',
    20 : 'white',
    21 : 'white',
    22 : 'white',
    23 : 'white'
  },

  serverMessage :[] ,
  standardMessage: [],

  user: null
};

const globals = new Proxy(globalObjects, handler);

export { globals }
