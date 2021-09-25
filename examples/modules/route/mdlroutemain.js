import {Module, Router, Util} from '../../../dist/nodom.js'
export class MdlRouteMain extends Module {
    template(){
        return `
        <div>
            <div>当前时间:{{formatDate(date1)}}</div>
            <a x-route='/router' class={{page1?'colorimp':''}} active='page1'>page1</a>
            <div x-router></div>
        </div>
        `;
    }
<<<<<<< HEAD
    data={
=======
    model={
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
        page1: true,
        page2: false,
        date1: (new Date()).getTime()
    }

    methods={
        formatDate(d){
            return Util.formatDate(d,'yyyy/MM/dd');
        },
        onBeforeFirstRender(){
            let hash = location.hash;
            if(hash){
                Router.go(hash.substr(1));
            }else{
                Router.go('/router/route1/home');
            }
        }
    }
}