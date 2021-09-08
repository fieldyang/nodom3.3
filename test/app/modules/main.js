import {Module} from '../../../dist/nodom.js'
import {ModuleA} from './modulea.js'
export class ModuleMain extends Module{
    template(){
        return `
            <div>
            <div>hello world!</div>
           <ModuleA />
           </div>
        `
    }
    model = {
            x:123
        }
    
    methods(){
        return {
            aaa(){
            }
        }
    }
    modules = [ModuleA]
    
}