import {Module,registModule} from '../../dist/nodom.js'
import {ModuleB} from './moduleb.js'
export class ModuleA extends Module{
    template(props){
        if(props.p1){
            return `
                <div>
                    <div>这是子模块A</div>
                    <p>模块A的内容</p>
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
                    <div>
                        <p>这是外部数据x2:{{x2}}</p>
                        <slot name='s2'>第二个slot</slot>
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

<<<<<<< HEAD
    methods = {
<<<<<<< HEAD
        onBeforeFirstRender(){
            console.log(this);
        },
        changeX2(model,dom,){
            model.x2 = 'hahaha'
=======
        changeX2(model){
            model.x2='hello';
            console.log(model);
        },
        onBeforeFirstRender(){
            // console.log(this);
        },
        onBeforeRender(model){
            if(!this.props || !this.props.$data){
                return;
            }
            for(let k of Object.keys(this.props.$data)){
                model[k] = this.props.$data[k];
            }
            delete this.props.$data
>>>>>>> 7f23f804704351135f6c900ed982ade3ed659656
=======

    changeX2(model){
        model.x2='hello';
        console.log(model);
    }
    onBeforeFirstRender(){
        // console.log(this);
    }
    onBeforeRender(model){
        if(!this.props || !this.props.$data){
            return;
        }
        for(let k of Object.keys(this.props.$data)){
            model[k] = this.props.$data[k];
>>>>>>> 0547aeb95f8b05ff2f4047578fd747ba01df2ef2
        }
        delete this.props.$data
    }
}

registModule(ModuleA,'mod-a');
