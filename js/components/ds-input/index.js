import { dce } from '../../shared/helpers.js';

class dsInput extends HTMLElement {
  constructor( params ) {
    super();
    Object.assign( this, params );
    this.render = this.render.bind(this)
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {}

  render() {
    let inputContainer = dce({el: 'div'});
    inputContainer.className = this.cssClass || null;
	inputContainer.setAttribute('style', this.cssStyle || null);


    // add label
    inputContainer.appendChild(document.createTextNode(`${this.label || ''}`))

    let input = dce({el: 'input', attrbs: [["type", this.type || 'text']]})
    if(this.attrbs) {
      this.attrbs.forEach(attrb => {
          input.setAttribute(attrb[0], attrb[1])
      });
    }

    input.addEventListener('keyup', ( ) => {
      this.value = input.value;
	  if(this.onkeyup) {
		this.onkeyup(input.value);
	  }
    }, false);


    this.value = input.value;
    inputContainer.append(input)

    this.append(inputContainer);
    }
}

window.customElements.define('ds-input', dsInput);

export default dsInput;
