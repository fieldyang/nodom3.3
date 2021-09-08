import {Module} from '../../../dist/nodom.js'

export class ModuleA extends Module{
    template(){
        return `
            <div>
                <div>这是模块{{name}}</div>
                <div>这是外部数据{{x1}}</div>
            </div>
        `
    }
    model= {
        name:'yang',
        x1:0
    }
}