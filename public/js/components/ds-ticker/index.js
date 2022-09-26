class dsTicker extends HTMLElement {
    constructor( params ) {
      super();
      this.params = params || {};
      this.render = this.render.bind(this);

      this.ticker = document.createElement("div");
      this.ticker.className='status-ticker';
//      ticker.appendChild(document.createTextNode(`${this.params.title || ''}`))
    }
  
    connectedCallback() {
      this.render();
    }
  
    disconnectedCallback() {}

    notify( params ) {
      this.ticker.innerHTML = "";
      this.querySelector('.status-ticker').classList.add('active');
      this.ticker.append(document.createTextNode(params.title))
    }

    update( params ) {
      this.ticker.innerHTML = "";
      this.ticker.append(document.createTextNode(params.title))
    }
  
    hide( params ) {
      setTimeout( () => {
        this.querySelector('.status-ticker').classList.remove('active');
      }, params.timeOut);        
    }
    render() {   
        this.append(this.ticker);
      }
  }
  
  window.customElements.define('ds-ticker', dsTicker);
  
  export default dsTicker;