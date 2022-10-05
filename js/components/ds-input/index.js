import { dce } from '../../shared/helpers.js';

class dsInput extends HTMLElement {
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
    let inputContainer = dce({el: 'div'});
    inputContainer.className = this.params.cssClass || null;

    // add label
    inputContainer.appendChild(document.createTextNode(`${this.params.label || ''}`))

    let input = dce({el: 'input'})
    if(this.params.attrbs) {
      this.params.attrbs.forEach(attrb => {
          input.setAttribute(attrb[0], attrb[1])
      }); 
    }

    inputContainer.append(input)

    this.append(inputContainer);
    }
}

window.customElements.define('ds-input', dsInput);

export default dsInput;