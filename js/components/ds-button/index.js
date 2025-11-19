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
    let button = document.createElement("button");
    button.className = this.params.cssClass || '';
	button.setAttribute('style', this.params.cssStyle || null);

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
