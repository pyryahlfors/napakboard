import { dce, svg } from '../../shared/helpers.js';

 
class bottomNavi {
    constructor( params ) {
        this.naviContainer = dce({el: 'footer', cssClass: 'bottom-navi'});

        const navContainer = dce({el: 'NAV'});

        // Load icons
        this.icons = svg({el: 'svg', attrbs: [["viewBox","0 0 30 30"]]});

        fetch('/projects/napakboard/images/icons.svg')
            .then(r => r.text())
            .then(text => {
                this.icons.innerHTML = text;
                createLinks();
            })
            .catch(console.error.bind(console));
            
        const createLinks = () => {
            let linksContainer = dce({el: 'div', cssClass: 'nav-bottom-links'});
            for( let navigationItems in params.options ) {
                let naviItem = dce({el: 'a', cssClass: `link-container`});
                if(params.options[navigationItems].disabled) {naviItem.classList.add('disabled')}
                naviItem.addEventListener('click', () => {
                    if(params.options[navigationItems].disabled) {
                        return;
                    }
                    params.options[navigationItems].link()
                }, false);

                let naviIcon = svg({el: 'svg', attrbs: [['viewBox', '0 0 24 24']]});
                naviIcon.append(this.icons.querySelector(`.${params.options[navigationItems].icon}`).cloneNode(true));
                naviItem.append(naviIcon, document.createTextNode(params.options[navigationItems].title))
                linksContainer.appendChild(naviItem)
            }
            navContainer.append(linksContainer)    
        }

        let toggleOtc = dce({el: 'A', cssClass: 'more'});
        let toggleSpan = dce({el: 'SPAN', content: '→'});
        toggleOtc.appendChild(toggleSpan)

        toggleOtc.addEventListener('click', () => { document.body.classList.toggle('otc')}, false);

        navContainer.appendChild(toggleOtc);
        this.naviContainer.append(navContainer)


        this.render = () => {
            return this.naviContainer;
        }
    }
}

export default bottomNavi;