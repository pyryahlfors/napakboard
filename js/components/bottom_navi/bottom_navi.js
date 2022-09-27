import { dce } from '../../shared/helpers.js';

 
class bottomNavi {
    constructor( params ) {
        this.naviContainer = dce({el: 'div', cssClass: 'bottom-navi'});
/*
        let naviHandle = dce({el: 'div', cssClass: 'navi-handle'});
        this.naviContainer.appendChild(naviHandle);

        naviHandle.addEventListener('click', () => {
            this.naviContainer.isOpen = !this.naviContainer.isOpen;
            this.naviContainer.style.height = this.naviContainer.isOpen ? '300px' : null;
        }, false)
*/

        for( let itemRows in params.options ) {
            let routeOptionsContainer = dce({el: 'div', cssClass: 'nakki'});

            params.options[itemRows].forEach(routeOptions => {
                let naviItem = dce({el: 'div', cssClass: 'navi-item'});
                naviItem.addEventListener('click', ( ) => { routeOptions[1]() }, false);
                naviItem.innerHTML = routeOptions[0];
                routeOptionsContainer.appendChild(naviItem)
                });

            this.naviContainer.append(routeOptionsContainer)    
        }


        this.render = () => {
            return this.naviContainer;
        }
    }
}

export default bottomNavi;