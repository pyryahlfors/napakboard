import { dce } from '../../shared/helpers.js';

class dsModal extends HTMLElement {
  constructor( params ) {
    super();
    this.params = params || {};
    }

    connectedCallback() {
      this.render();
    }

    disconnectedCallback() {
    }

    close() {
      let self = this;
      self.parentNode.removeChild(self);
    }


    render() {
      let modalShadow = dce({el: 'DIV', cssClass: 'modal-shadow'});
      let container = dce({el: 'DIV', cssClass: 'modal-window'});

      let modalTitle = dce({el: 'div', cssClass: 'modal-title'});
      let title = dce({el: 'h3', content: this.params.title || ''});
      modalTitle.appendChild(title);

      let modalContent = dce({el: 'div', cssClass: 'modal-content'});
      modalContent.append(this.params.content)

      let modalOptions = dce({el: 'div', cssClass: 'modal-options'});

      this.params.options.forEach( item => {
        for ( let i in item ) {
          modalOptions.append(item[i])
        }
      });

	  if(this.params.onscroll) {
		modalContent.addEventListener('scroll', (e) => {
			this.params.onscroll(e);
		}, false);
		}

      container.append(modalTitle, modalContent, modalOptions)

      modalShadow.appendChild(container)

      this.append(modalShadow);

     }
  }

  window.customElements.define('ds-modal', dsModal);
  export default dsModal;
