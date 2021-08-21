import {Module} from '../../../dist/nodom.js'
import {ModuleA} from './modulea.js'
// defineModule(
//     'ModuleMain',
//     {

//     }
// )
export class ModuleMain extends Module{
    template(){
        return `
            <div>hello world!</div>
            <div x-module='ModuleA'></div>
        `
    }

    model() {
        return {x:1}
    }
    
    methods(){
        return{
            aaa(){

            }
        }
    }
    modules(){
        return [ModuleA]
    }
}