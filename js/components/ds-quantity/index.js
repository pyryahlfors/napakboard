import { dce } from '../../shared/helpers.js';

class dsQuantity extends HTMLElement {
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
    this.className = this.cssClass || null;
	this.setAttribute('style', this.cssStyle || null);



    // add label
    inputContainer.appendChild(document.createTextNode(`${this.label || ''}`))

	let inputHolder = dce({el: 'div', cssClass: 'ds-quantity'});

	let plusButton = dce({el:'button', content: '+', attrbs: [['type', 'button'], ['aria-label', 'Increase quantity']]})
	let minusButton = dce({el:'button', content: '-', attrbs: [['type', 'button'], ['aria-label', 'Decrease quantity']]})

	let input = this.input || dce({el: 'input', attrbs: [["type", 'text']]})
    if(this.attrbs) {
      this.attrbs.forEach(attrb => {
          input.setAttribute(attrb[0], attrb[1])
      });
    }

	input.addEventListener("input", (e)=>{
		input.value = input.value.replace(/[^0-9,.]/g, '');
		this.value = input.value;
	}, true)


	const changeValue = (direction) => {
		if (input.disabled || input.readOnly) return;
		const min = input.min ? Number(input.min) : -Infinity;
		const max = input.max ? Number(input.max) : Infinity;
		const step = Number(input.step) > 0 ? Number(input.step) : 1;
		const current = Number(input.value.replace(',', '.'));
		const next = Math.max(min, Math.min(max, (Number.isFinite(current) ? current : 0) + direction * step));
		if (!Number.isFinite(next)) return;
		input.value = String(Number(next.toFixed(10)));
		input.dispatchEvent(new Event('input', {bubbles: true}));
	};
	minusButton.disabled = input.disabled;
	plusButton.disabled = input.disabled;
	minusButton.addEventListener('click', () => changeValue(-1), false);
	plusButton.addEventListener('click', () => changeValue(1), false);

    this.value = input.value;

	inputHolder.append(minusButton, input, plusButton);

    inputContainer.append(inputHolder)

    this.append(inputContainer);
    }
}

window.customElements.define('ds-quantity', dsQuantity);

export default dsQuantity;
