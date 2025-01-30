import { dce } from '../../shared/helpers.js';

class dsSelect extends HTMLElement {
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
    let selectContainer = dce({el: 'div'});
    selectContainer.className = this.params.cssClass || null;

    // add label
    selectContainer.appendChild(document.createTextNode(`${this.params.label || ''}`))

    let select = dce({el: 'select'})
    if(this.params.attrbs) {
      this.params.attrbs.forEach(attrb => {
        select.setAttribute(attrb[0], attrb[1])
      });
    }

    if(this.params.options) {
      this.params.options.forEach(option => {
        let item = dce({el: 'option', attrbs: [
			['value', option[1]],
			[option[2] ? 'selected' : null, option[2] ? 'selected' : null]
		]});
        item.appendChild(document.createTextNode(option[0]))
        select.appendChild(item);
      })
    }

    this.value = select.value;

    select.addEventListener('change', () => {
      this.value = select.value;
	  if(this.params.change) {
		this.params.change(select.value)
	  }
    }, false)

    selectContainer.append(select)

    this.append(selectContainer);
    }
}

window.customElements.define('ds-select', dsSelect);

export default dsSelect;


