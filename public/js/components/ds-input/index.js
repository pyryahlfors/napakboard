class dsButton extends HTMLElement {
  constructor( params ) {
    super();
    this.params = params || {};
    this.render = this.render.bind(this)
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {}

  render() {
    while (this.shadow.childNodes.length > 1) { this.shadow.removeChild(this.shadow.lastChild); } // do not remove stylesheet

    let button = document.createElement("button");
    button.className = this.params.cssClass || '';

    button.appendChild(document.createTextNode(`${this.params.title || ''}`))

    if ( this.params.thisOnClick ) {
      button.addEventListener('click', () => { 
          this.params.thisOnClick();
      })
    }

    this.append(button);
    }
}

window.customElements.define('ds-button', dsButton);

export default dsButton;