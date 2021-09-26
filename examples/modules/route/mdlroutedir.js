import {Module} from '../../../dist/nodom.js'
export class MdlRouteDir extends Module {
    template(){
        return `
        <div>
        <p class='title'>路由用法例子</p>
        <div style='background:#f0f0f0'>
            <div style='border-bottom: 1px solid #999' test='router'>
                <a x-repeat={{routes}} x-route='{{path}}'  class={{active?'colorimp':''}} active='active' style='margin:10px'>{{title}}</a>
            </div>
            <div x-router test='routerview'></div>
        </div>
        </div>
        `;
    } 
    model = {
        routes: [{
                title: '路由用法1-基本用法',
                path: '/router/route1',
                active: true
            },
            {
                title: '路由用法2-路由参数用法',
                path: '/router/route2',
                active: false
            },
            {
                title: '路由用法3-路由嵌套用法',
                path: '/router/route3',
                active: false
            }
        ]
    }
}
