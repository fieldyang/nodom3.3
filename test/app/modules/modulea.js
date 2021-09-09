import {Module} from '../../../dist/nodom.js'

export class ModuleA extends Module{
    template(){
        return `
            <div>
                <div>这是子模块{{name}}</div>
                <div>这是外部数据x1:{{x1}}</div>
                <div>这是外部数据x2:{{x2}}</div>
                <button e-click='changeX2'>修改x2</button>
            </div>
        `
    }
    model = {
        name:'yang',
        x1:0,
        x2:0
    }

    methods = {
        onBeforeFirstRender(){
            console.log(this);
        },
        changeX2(dom,module){
            this.x2 = 'hahaha'
        }
    }
}