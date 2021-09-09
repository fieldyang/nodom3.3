import {Module} from '../../../dist/nodom.js'
import {ModuleA} from './modulea.js'
export class ModuleMain extends Module{
    template(){
        return `
            <div>
            <button e-click='change'>change</button>
            <div>hello world!</div>
            <div>x.y is {{x.y}}</div>
            <div>y is {{y}}</div>
           <ModuleA x-data={{getData()}}/>
           </div>
        `
    }
    model = {
            x:{
                y:123
            },
            y:'hello'
        }
    
    methods = {
        getData(){
            return {
                x1:'x.y',
                x2:['y',true]
            }
        },
        change(){
            this.y = 'aaaa';
            console.log(this);
        }
        
    }
    modules = [ModuleA]
    
}