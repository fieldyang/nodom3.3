import {Module} from '../../../dist/nodom.js'
/**
 * 路由主模块
 */
export class MdlMod4 extends Module {
    template(){
        return `<div test='1'>这是{{$route.data.page}}页,编号是{{$route.data.id}}
            <div>
<<<<<<< HEAD
                <a x-repeat='routes' x-route='{{path}}'  class={{active?'colorimp':''}} active='active'>{{title}}</a>
=======
                <a x-repeat='routes' x-route='{{path}}'  class={{active?'colorimp':''}} active='active'  style='margin:10px'>{{title}}</a>&nbsp;
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
                <div x-router></div>
            </div>
        </div>`
    }
<<<<<<< HEAD
    data =  {
=======
    model =  {
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
        routes: [{
                title: '商品详情',
                path: '/router/route2/rparam/home/1/desc',
                active: true
            },
            {
                title: '评价',
                path: '/router/route2/rparam/home/1/comment',
                active: false
            }
        ]
    }
}