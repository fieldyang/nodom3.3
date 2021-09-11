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
            <ModuleA x-repeat={{rows}} x-data={{getData()}}/>
           </div>
        `
    }
    model = {
            show:true,
            x:{
                y:123
            },
            y:'hello',
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
            console.log(this);
        }
        
    }
    modules = [ModuleA]
    
}