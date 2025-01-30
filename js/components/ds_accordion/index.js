class dsAccordion extends HTMLElement {
  constructor( {
    items = [],           // 
    defaultOpen = false,  // all items are open
    singleOpen = false,   // allow only one item to be open at a time 
    } = {}) {
 
    super();

    this.shadow = this.attachShadow({mode: 'open'});
    
    /*
    get parameters from attributes (HTML) or from object (JS). If not set use defaults set in constructor
    */
    this.defaultOpen = this.hasAttribute("open") || defaultOpen;
    this.singleOpen = this.hasAttribute("single") || singleOpen;

    this.items = items;

    // Render children from object (JS)
    if( this.items.length > 0 ) {
      this.renderChildren();
    }
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
  }

  // 
  renderChildren() {
    let docFrag =document.createDocumentFragment();

    this.items.forEach( el => {
      let container = document.createElement("ds-accordion--item");
      if(el.open) {container.setAttribute("open", true);}
      container.title = el.title;

      let containerContent = document.createElement("DIV");
      
      if (typeof(el.content) === 'object') { containerContent.append(el.content) }
      else { containerContent.innerHTML = el.content; }

      if (el.onclick) {
        let self = container;
        container.onclick = (() => { el.onclick.bind(container)() }).bind(self);
      }

      container.kakka = 'pökäle';
      container.appendChild(containerContent);
      docFrag.appendChild(container)
    });

  this.appendChild(docFrag)
  }

  toggleVisibility(el) {
    let contentContainer = el.parentNode.querySelector('.ds-accordion__content');

    // Set element height for animation if it's missing on start
    if( !contentContainer.style.height ) { contentContainer.style.height = `${contentContainer.scrollHeight}px`; }

    el.parentNode.classList.toggle('ds-accordion__item--hidden');

    // Close animation
    if ( el.parentNode.classList.contains('ds-accordion__item--hidden') ) {
      setTimeout( () => { contentContainer.style.height = `0px`; }, 10 );
    }
    else {
      contentContainer.style.height = `${contentContainer.scrollHeight}px`;
    }

    // Close others if singleOpen is true
    if( this.singleOpen ) {
      const children = Array.from(this.shadow.querySelectorAll('.ds-accordion__item'));

      children.forEach( (accordionItem) => {
        if( accordionItem !== el.parentNode ) {
          let accordionContentContainer = accordionItem.querySelector('.ds-accordion__content');
          // Set element height for animation if it's missing on start
          if( !accordionContentContainer.style.height ) { accordionContentContainer.style.height = `${accordionContentContainer.scrollHeight}px`; }

          accordionItem.classList.add('ds-accordion__item--hidden');
          setTimeout( () => { accordionContentContainer.style.height = `0px`; }, 10 );
        }
      });
      }
  }

  render() {
    let accordionStyles = document.createElement("link")
    accordionStyles.setAttribute("rel", "stylesheet");
    accordionStyles.setAttribute("href", `/js/components/ds_accordion/ds_accordion.css?disableCache=${new Date().getTime()}`);

    let container = document.createElement("div");
    container.className="ds-accordion";

    [...this.children].forEach( ( el ) => { 
      let itemContainer = document.createElement("div");
      itemContainer.className="ds-accordion__item";
      if(!this.defaultOpen) {
        if(!el.hasAttribute("open") ) {
          itemContainer.classList.add('ds-accordion__item--hidden')
        }
      }

      let titleRowContainer = document.createElement("div");
      titleRowContainer.className = "ds-accordion__header-container";
      let itemTitle = document.createElement("h2");
      itemTitle.appendChild(document.createTextNode(el.title || 'Title'));

      titleRowContainer.addEventListener('click',() => {
        this.toggleVisibility(titleRowContainer);
        if(el.onclick) { el.onclick(); }
      });

      let itemContent = document.createElement("DIV");
      itemContent.className="ds-accordion__content";
      itemContent.innerHTML = el.innerHTML; 
      
      let openCloseIndicator = document.createElement("DIV");
      openCloseIndicator.className="ds-accordion__item-indicator"
      openCloseIndicator.appendChild(document.createTextNode('↑'));
      
      titleRowContainer.append(itemTitle, openCloseIndicator);
      itemContainer.append(titleRowContainer, itemContent);

      container.append(itemContainer);
    })
    this.shadow.append(accordionStyles, container);
  }
}

window.customElements.define('ds-accordion', dsAccordion);
export default dsAccordion;