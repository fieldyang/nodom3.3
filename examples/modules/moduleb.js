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
    data = {
        name:'yang',
        x1:0,
        x2:0
    }

<<<<<<< HEAD
    methods = {
        onBeforeFirstRender(){
<<<<<<< HEAD
            console.log(this);
        },
        changeX2(dom,module){
            console.log(this);
            this.x2 = 'hahaha'
=======
            // console.log(this);
        },
        changeX2(model,dom){
            // console.log(this);
            model.x2 = 'hahaha'
>>>>>>> 7f23f804704351135f6c900ed982ade3ed659656
        }
=======
    
    onBeforeFirstRender(){
        // console.log(this);
    }
    changeX2(model,dom){
        // console.log(this);
        model.x2 = 'hahaha'
>>>>>>> 0547aeb95f8b05ff2f4047578fd747ba01df2ef2
    }

    modules = [ModuleC]
}

registModule(ModuleB,'mod-b');