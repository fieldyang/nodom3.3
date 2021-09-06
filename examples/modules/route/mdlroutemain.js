import {Module, Util} from '../../../dist/nodom.js'
export class MdlRouteMain extends Module {
    template = `
    <div>
        <div>当前时间:{{formatDate(date1)}}</div>
        <a x-route='/router' class={{page1?'colorimp':''}} active='page1'>page1</a>
        <div x-router></div>
    </div>
    `;
    model={
        page1: true,
        page2: false,
        date1: (new Date()).getTime()
    }

    methods={
        formatDate(d){
            return Util.formatDate(d,'yyyy/MM/dd');
        }
    }
}