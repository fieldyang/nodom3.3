import {Module,registModule} from '../../dist/nodom.js'

export class ModuleE extends Module{
    template(){
        // this.model.rows = this.props.$data.rows;
        return `
            <div>
                <for cond={{rows}}>
                    <div>id is:{{id}},name is:<span style='color:red;font-weight:bold;padding-left:10px'>{{name}}</span></div>
                </for>
            </div>
        `
    }
    // data(){
    //     return {
    //         xxx:1,
    //         rows:[
    //             {id:1,name:'nodom1'},
    //             {id:2,name:'noomi1'},
    //             {id:3,name:'relaen1'}
    //         ]
    //     }
    // }
}

registModule(ModuleE,'mod-e');