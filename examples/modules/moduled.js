import {Module,registModule} from '../../dist/nodom.js'

export class ModuleD extends Module{
    template(props){
        return `
            <div>
                <p>mod-d</p>
                <button style='background:gold'>按钮</button>
            </div>
        `
    }
    data(){
        return{
            x1:0,
            x2:0
        }
    }
}

registModule(ModuleD,'mod-d');