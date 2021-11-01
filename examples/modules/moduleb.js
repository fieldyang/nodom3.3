import {Module,registModule} from '../../dist/nodom.js'
import { ModuleC } from './modulec.js';

export class ModuleB extends Module{
    template(props){
        return `
            <div>
                <div>这是子模块B</div>
                <p>模块B的内容</p>
                <slot>haha slot b</slot>
            </div>
        `
        
    }
    data(){
        return{
            name:'yang',
            x1:0,
            x2:0
        }
    }

    
    onBeforeFirstRender(){
        // console.log(this);
    }
    changeX2(model,dom){
        // console.log(this);
        model.x2 = 'hahaha'
    }

    modules = [ModuleC]
}

registModule(ModuleB,'mod-b');