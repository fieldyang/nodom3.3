import {Module} from '../../dist/nodom.js'
import {ModuleA} from './modulea.js'
export class ModuleMain extends Module{
    template(){
        return `
            <div>
                <button e-click='change'>change</button>
                <div>y is {{y}}</div>
                <div>x.y is {{x.y}}</div>
                <h2>默认plug</h2>
                <p>第一个子模块</p>
                <ModuleA x-data={{getData()}} xxx='111'>
                    <slot>
                        <h3 style='color:blue'> hello change plug 1</h3>    
                    </slot>
                    <slot name='s2'>替换的第二个slot  {{name}}</slot>
                </ModuleA>
                <hr/>
                <p>第二个子模块</p>
                <h2>替换plug</h2>
                <ModuleA x-data={{{n:'name',x1:'x.y',x2:['y',true]}}} xxx='222'>
                    <slot>
                        <h3 style='color:red'> hello change plug 2</h3>    
                    </slot>
                    
                </ModuleA>
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
        change(){
            this.show = false;
            this.y = 'aaaa';
            // console.log(this);
        }
        
    }
    modules = [ModuleA]
    
}