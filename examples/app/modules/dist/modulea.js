/**
 * 模块A
 */
class ModuleA extends nodom.Module {
    constructor(cfg) {
        let config = nodom.Util.merge(cfg, {
            template: `
                <slot name='title'></slot>
                <slot name='btn1'>
                <button e-click='sendMsg'> 发送</button></slot>
                <button e-click='addData'>添加</button>
                <slot name='picture'> picture</slot>  
                <ul>
                    <li x-repeat='foods' class='item'>{{name}}</li>
                </ul>
            `,
            requires:[{type:'css',url:'index.css'}],
            methods: {
                addData: function (dom,model) {
                    console.log(model.data);
                    model.data.foods.push({ id: 4, name: '烤羊蹄', price: '58' });
                },
                sendMsg: function (dom, model, module) {
                    module.send('modb1', 'hello',1);
                }
            }
        });
        super(config);
    }
}
//# sourceMappingURL=modulea.js.map