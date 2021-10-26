import {Module,registModule} from '../../dist/nodom.js'

export class ModuleC extends Module{
    template(props){
        return `
            <div>
                <div>这是子模块C</div>
                <slot innerRender></slot>
            </div>
        `
        
    }
    data = {
        name:'modulec',
        x1:0,
        x2:0
    }

    methods = {
        onBeforeFirstRender(){
            // console.log(this);
        },
        changeX2(dom,module){
            console.log(this);
            this.x2 = 'hahaha'
        }
    }
}

registModule(ModuleC,'modc');