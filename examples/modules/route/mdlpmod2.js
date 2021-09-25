import {Module} from '../../../dist/nodom.js'
export class MdlPMod2 extends Module {
    template(){
        return `
        <div class='result code1'>
        <div style='border-bottom: 1px solid #999' test='route1'>
            <!--用repeat指令生成路由元素-->
<<<<<<< HEAD
            <a x-repeat={{routes}} x-route={{path}} class={{active?'colorimp':''}} active='active'  style='margin:10px'>{{title}}</a>
=======
            <a x-repeat={{routes}} x-route={{path}} class={{active?'colorimp':''}} active='active'  style='margin:10px'>{{title}}</a>&nbsp;
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
        </div>
        <div x-router test='2'></div>
        </div>
        `;
    }
<<<<<<< HEAD
    data = {
=======
    model = {
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
        routes: [{
                title: '首页2',
                path: '/router/route2/rparam/home/1',
                useParentPath: true,
                active: true
            },
            {
                title: '列表2',
                path: '/router/route2/rparam/list/2',
                useParentPath: true,
                active: false
            },
            {
                title: '数据2',
                path: '/router/route2/rparam/data/3',
                useParentPath: true,
                active: false
            }
        ]
    }
}