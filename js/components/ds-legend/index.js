class dsLegend extends HTMLElement {
  constructor( {
    title = '',
    type = 'grade',
    cssClass = ''
    } = {}) {

    super();

    this.title = title;
    this.type = type;
    this.cssClass = cssClass;
    this.shadow = this.attachShadow({mode: 'open'});

    let legendStyles = document.createElement("link")
    legendStyles.setAttribute("rel", "stylesheet");
//    legendStyles.setAttribute("href", `/projects/napakboard/js/components/ds-legend/ds_legend.css?disableCache=${new Date().getTime()}`);
    legendStyles.setAttribute("href", `/projects/napakboard/js/components/ds-legend/ds_legend.css?disableCache=1`);

    this.shadow.append(legendStyles);

    this.render = this.render.bind(this)
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {}

  render() {
    while (this.shadow.childNodes.length > 1) { this.shadow.removeChild(this.shadow.lastChild); } // do not remove stylesheet

    let button = document.createElement("DIV");
    let buttonClasses = [
      `legend-${this.type}`,
      this.cssClass
      ];

      button.classList.add(...buttonClasses);

    button.appendChild(document.createTextNode(`${this.title || this.textContent}`))
    this.shadow.append(button);
    }
}

window.customElements.define('ds-legend', dsLegend);
export default dsLegend;
