module.exports = {
  initialize : () => {
    // https://www.npmjs.com/package/rpi-ws281x-native
    this.ws281x = require('rpi-ws281x-native');

    this.channel = this.ws281x(250, { stripType: 'ws2812' }); // number of leds = boardWidth * boardHeight - 1 ( starts from zero )
    this.colorArray = this.channel.array;

    /** Board setup **/
    this.boardWidth = 11;
    this.boardHeight = 21;
    this.boardCols = "abcdefghijklmnopqrstuvwxyz";

    this.boardOffset = 230; // set to 0 if A1 is first led in string. In my setup the first led is in K21 (-> 11*21 - 1 = 230)
    /**
    A B C D E F ..... K
    1 | +-+ +-+ +-     -+
    2 | | | | | |       |
    ... | | | | | |       |
    21 +-+ +-+ +-+       ↑
    */

    // 2811 is GRB
    this.holdColors = {
    'start'        : '00ff00',
    'intermediate' : '0000ff',
    'top'          : 'ff0000'
    }
  },

  lit : ( route ) => {
    const convertGridPosition = ( pos ) => {
      let grid = pos.match(/[a-zA-Z]+|[0-9]+/g); // separate grid row and grid colum, [0] row, [1] col
  
      let ledRow = Number( this.boardCols.indexOf( grid[0] ) );
      let ledCol = ledRow % 2 == 0 ? Number( grid[1] ) - 1 : -1 * Number( grid[1] ) + this.boardHeight; // every second row is going opposite direction (up to down / down to up)
  
      return  Math.abs( ( ledRow * this.boardHeight ) + ledCol - this.boardOffset );
    };

    this.ws281x.reset(); // unlit all bulbs

    const holdSetup = route.holdSetup;
    for(let node in holdSetup) {
        let ledPosition = convertGridPosition(node);
        console.log(`Grid position: ${node}, strip order: ${ledPosition}, type: ${holdSetup[node]}` );
        this.colorArray[ledPosition] = `0x${this.holdColors[holdSetup[node]]}`;
    }
    // Render route
    this.ws281x.render();
  }
}
