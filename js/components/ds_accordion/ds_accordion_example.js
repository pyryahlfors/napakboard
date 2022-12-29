import dsAccordion from '../ds_accordion/index.js';

let mother = document.querySelector('.examples');

let htmlContentExample = document.createElement("DIV");
htmlContentExample.className = `dummy`;
let image = document.createElement("IMG");
image.src = `https://www.fillmurray.com/320/200`;
htmlContentExample.append(image);

let accordionItems = [{
    title: 'Item # 1',
    content: htmlContentExample,
    open: true
    },
    {
    title: 'Item # 2',
    content: 'asdasdas'    
    },
    {
    title: 'Item # 3',
    content: 'Lorem ipsum'    
    }
];


// Default
let defaultExampleTitle = document.createElement("SPAN");
defaultExampleTitle.className = 'example-title';
defaultExampleTitle.appendChild(document.createTextNode("Default"));

let defaultExampleContainer = document.createElement("DIV");
defaultExampleContainer.className = 'example-container';

let accordion = new dsAccordion({items: accordionItems});
defaultExampleContainer.appendChild(accordion);
mother.append(defaultExampleTitle, defaultExampleContainer);


// Default open
let defaultOpenExampleTitle = document.createElement("SPAN");
defaultOpenExampleTitle.className = 'example-title';
defaultOpenExampleTitle.appendChild(document.createTextNode("Default open"));

let defaultOpenExampleContainer = document.createElement("DIV");
defaultOpenExampleContainer.className = 'example-container';

let accordionDefaultOpen = new dsAccordion({defaultOpen: true, items: accordionItems});
defaultOpenExampleContainer.append(accordionDefaultOpen)
mother.append(defaultOpenExampleTitle, defaultOpenExampleContainer)


// Single open
let singleOpenExampleTitle = document.createElement("SPAN");
singleOpenExampleTitle.className = 'example-title';
singleOpenExampleTitle.appendChild(document.createTextNode("Single open"));

let singleOpenExampleContainer = document.createElement("DIV");
singleOpenExampleContainer.className = 'example-container';

let accordionSingleOpen = new dsAccordion({singleOpen: true, items: accordionItems});
singleOpenExampleContainer.append(accordionSingleOpen)
mother.append(singleOpenExampleTitle, singleOpenExampleContainer)


// onClick
let onClickExampleTitle = document.createElement("SPAN");
onClickExampleTitle.className = 'example-title';
onClickExampleTitle.appendChild(document.createTextNode("onClick"));

let onClickExampleContainer = document.createElement("DIV");
onClickExampleContainer.className = 'example-container';

let accordionOnClick = new dsAccordion({singleOpen: true, items: [{
    title: 'Click me',
    content: 'Check console',
    onclick: function() { console.log(this) }
    },
    {
        title: 'Click me too!',
        content: 'Check console',
        onclick: () => { console.log('Hello. _THIS_ is not bound'); console.log(this);  } // can't bind this to ES6 arrow function
    }]});
onClickExampleContainer.append(accordionOnClick)
mother.append(onClickExampleTitle, onClickExampleContainer)
