import {Module,registModule} from '../../dist/nodom.js'
import {ModuleB} from './moduleb.js'
export class ModuleA extends Module{
    template(props){
        if(props.p1){
            return `
                <div>
                    <div>这是子模块A</div>
                    <slot></slot>
                </div>
            `
        }else if(props.temp){
            return `
                <div>
                    <h1>props传模版</h1>
                    ${props.temp}
                </div>
            `
            
        }else{
            return `
                <div>
                    <div>这是子模块2</div>
                    <div>这是外部数据name:{{n}}</div>
                    <slot>
                        hello plug
                    </slot>
                    <div>这是外部数据x1:{{x1}}</div>
                    <div>nodom
                        <p>这是外部数据x2:{{x2}}</p>
                        <!--<slot name='s2'>第二个slot</slot>-->
                    </div>
                    <button e-click='changeX2'>修改x2</button>
                </div>
            `
        }
        
    }
    data = {
        name:'yang',
        x1:0,
        x2:0,
        rows:[{name:'nodom1'},{name:'nodom2'},{name:'nodom3'}]
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
    modules = [ModuleB];
}

registModule(ModuleA,'mod-a');