import dsButton from '../ds_button/index.js';

let mother = document.querySelector('.examples');


// Default
let defaultExampleTitle = document.createElement("SPAN");
defaultExampleTitle.className = 'example-title';
defaultExampleTitle.appendChild(document.createTextNode("Default"));

let defaultExampleContainer = document.createElement("DIV");
defaultExampleContainer.className = 'example-container';

let defaultButton = new dsButton({title: 'Default button'});
defaultButton.style['display'] = 'block';
defaultButton.style['margin-bottom'] = '20px';

defaultExampleContainer.append(defaultButton)
mother.append(defaultExampleTitle, defaultExampleContainer)


// Stateful
let statefulExampleTitle = document.createElement("SPAN");
statefulExampleTitle.className = 'example-title';
statefulExampleTitle.appendChild(document.createTextNode("Stateful button"));

let statefulExampleContainer = document.createElement("DIV");
statefulExampleContainer.className = 'example-container';


let statefulButton = new dsButton({title: 'Stateful button 10', clicks:10});
statefulButton.addEventListener('click', () => {
    let self = statefulButton; 
    if(!isNaN(self.clicks)) { 
        self.clicks+= 1;
        self.title= `Stateful button ${self.clicks}`;
        if( self.clicks % 2 ) {
            self.classList.add('clicked');
            }
        else {
            self.classList.remove('clicked');
        }
    } 
 })

 statefulExampleContainer.append(statefulButton)
mother.append(statefulExampleTitle, statefulExampleContainer)

