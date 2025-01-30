import { dce } from '../../shared/helpers.js';
import { globals } from '../../shared/globals.js';

class dsToggle {
  constructor(params) {

    let switchElement = dce({el: 'DIV', cssClass: `on-off-selector ${params.cssClass}`});
    let firstOption = dce({el: 'SPAN', content: params.options[0].title});
    let secondOption = dce({el: 'SPAN', content: params.options[1].title});

    let switchEl = dce({el: 'DIV', cssClass: 'on-off-switch'});

    let switchStatus = params.options[0].selected ? false : true;
    globals[params.targetObj] = ( switchStatus ) ? params.options[1].value : params.options[0].value;
    if(switchStatus) { switchEl.classList.add('switched-off') };

    let toggle = () => {
      switchStatus = !switchStatus;
      switchEl.classList.toggle('switched-off');
      globals[params.targetObj] = ( switchStatus ) ? params.options[1].value : params.options[0].value;

      if(params.onToggle) {
        params.onToggle();
      }
    }
    switchEl.addEventListener('click', toggle, false);
    firstOption.addEventListener('click', toggle, false);
    secondOption.addEventListener('click', toggle, false);

    switchElement.append(firstOption, switchEl, secondOption);

    this.render = () => {
      return switchElement;
    }
  }
}

window.customElements.define('ds-toggle', dsToggle);
export default dsToggle;
