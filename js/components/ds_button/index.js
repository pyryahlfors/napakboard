import { proxyHandler } from '/js/shared/proxy.js';

class dsButton extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'clicks'];
  }
  
  constructor( { 
    title = '', 
    clicks=0,
    } = {}) {

    super();

    this.title = title;
    this.clicks = clicks;
    this.rendered = false;

    this.shadow = this.attachShadow({mode: 'open'});

    if ( this.hasAttribute('onclick')) {
      let self = this;
      this.thisOnclick = this.onclick.bind(self);
      this.removeAttribute('onclick')
    }

    let buttonStyles = document.createElement("link")
    buttonStyles.setAttribute("rel", "stylesheet");
    buttonStyles.setAttribute("href", `/js/components/ds_button/ds_button.css`); //?disableCache=${new Date().getTime()}`);

    this.shadow.append(buttonStyles);

    this.render = this.render.bind(this)
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    if(this.rendered) {
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {}

  render() {
    while (this.shadow.childNodes.length > 1) { this.shadow.removeChild(this.shadow.lastChild); } // do not remove stylesheet

    let button = document.createElement("button");

    let buttonClasses = [
      /*
      'forceDefaultClass'
      */
      ]; 

    if ( this.hasAttribute('class') ) {
      // concat button classes (filter boolean removes empty ones)
      buttonClasses = buttonClasses.concat( this.getAttribute('class').split(' ') ).filter(Boolean);
    }
    button.classList.add(...buttonClasses);

    button.appendChild(document.createTextNode(`${this.title || this.textContent}`))

    if ( this.thisOnclick ) {
      button.addEventListener('click', () => { 
          this.thisOnclick();
      })
    }

    this.shadow.append(button);
    this.rendered = true;
    }
}

window.customElements.define('ds-button', dsButton);

export default dsButton;