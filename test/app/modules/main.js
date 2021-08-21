import {Module} from '../../../dist/nodom.js'
import {ModuleA} from './modulea.js'
export class ModuleMain extends Module{
    template(){
        return `
            <div>hello world!</div>
            <ModuleA d-x1={{x}}></ModuleA>
        `
    }
    model(){
        return {
            x:123
        }
    }
    methods(){
        return {
            aaa(){
            }
        }
    }
    modules(){
        return [ModuleA]
    }
}