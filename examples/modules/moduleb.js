import {Module,registModule} from '../../dist/nodom.js'
import { ModuleC } from './modulec.js';

export class ModuleB extends Module{
    template(props){
        return `
            <div>
                <div>这是子模块B</div>
                <slot>haha slot b</slot>
            </div>
        `
        
    }
    data = {
        name:'yang',
        x1:0,
        x2:0
    }

    methods = {
        onBeforeFirstRender(){
            console.log(this);
        },
        changeX2(dom,module){
            console.log(this);
            this.x2 = 'hahaha'
        }
    }

    modules = [ModuleC]
}

registModule(ModuleB,'mod-b');