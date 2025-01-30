import { dce } from '../../shared/helpers.js';

class dsRadio extends HTMLElement {
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
    let radioContainer = dce({el: 'div'});
    radioContainer.className = this.params.cssClass || null;

    // add label
    radioContainer.appendChild(document.createTextNode(`${this.params.label || ''}`))

    let radioGroupContainer = dce({el: 'ul'});
    
    this.params.options.forEach(option => {
        let radioItemContainer = dce({el: 'li'});
        let item = dce({el: 'input', id: `${this.params.name}-${option.title}`, attrbs: [['type', 'radio'], ['value', option.value], ['name', this.params.name]]});
        if( option.checked) {
          item.checked = true;
        }
        let itemLabel = dce({el: 'label', attrbs: [['for', `${this.params.name}-${option.title}`]], content: option.title})
        radioItemContainer.append(item, itemLabel);
        radioGroupContainer.appendChild(radioItemContainer);

        if( this.params.onchange ) {
          item.addEventListener('change', () => { this.params.onchange(); }, false);
        }

    })

    radioContainer.append(radioGroupContainer)

    this.append(radioContainer);
    }
}

window.customElements.define('ds-radio', dsRadio);

export default dsRadio;