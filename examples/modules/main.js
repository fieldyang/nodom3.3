import {Module} from '../../dist/nodom.js'
import {ModuleA} from './modulea.js'
import {ModuleB} from './moduleb.js'
import {ModuleC} from './modulec.js'
export class ModuleMain extends Module{
    template(){
        return `
            <div>
                <button e-click='change'>change</button>
                <div>y is {{y}}</div>
                <div>x.y is {{x.y}}</div>
                <h2>默认slot</h2>
                <p>第一个子模块</p> 
                <!--<mod-a p1='true' xxx='111'>
                    <mod-b p2='false'>
                         <modc>
                            <div>hahaha</div>
                        </modc>
                    </mod-b>
                <slot>
                        <h3 style='color:blue'> hello change plug 1</h3>    
                    </slot>
                    <slot name='s2'>替换的第二个slot  {{name}}</slot>
                
                </mod-a>
    -->
    
                <hr/>
                <p>第二个子模块</p>
                <h2>替换plug</h2>
                <ModuleA x-data={{{'..yyy':'xxx',n:'name',x1:'x.y',x2:['y',true]}}} xxx='222'>
                    <slot>
                        <h3 style='color:red'> hello change plug 2</h3>    
                    </slot>
                    
                </ModuleA> 
            <!--
                <p>第三个子模块</p>
                <h2>默认子节点自动转换为slot节点</h2>
                <ModuleA xxx='333'>
                    
                    <p style='color:gold'>
                        我自动作为solot节点
                    </p>
                    <h3 style='color:gold'>
                        我自动作为solot节点
                    </h3>
                    <slot>hahaha</slot>
                </ModuleA>-->

                <mod-a temp={{genTemp(show)}}>
                </mod-a>
           </div>
        `
    }
    data = {
            show:true,
            x:{
                y:123
            },
            y:'hello world!',
            name:'yanglei',
            rows:[
                {name:'yang'},
                {name:'lei'},
            ]
        }
    
    methods = {
        getData(){
            // return {
            //     x1:'x.y',
            //     x2:['y',true]
            // }
            return{
                n:'name',
                x1:'x.y',
                x2:['y',true]
            }
        },
        change(model){
            model.show = false;
            model.y = 'aaaa';
            // console.log(this);
        },
        genTemp(show){
            if(show)
                return `
                    <p>这是传递的子模版111</p>
                    <div x-repeat={{rows}}>{{name}}</div>
                `;
            return`
                <p>这是传递的子模版222</p>
                <div>name is: {{name}}</div>
            `
        }
        
    }
    // modules = [ModuleA,ModuleB,ModuleC]
    
}
