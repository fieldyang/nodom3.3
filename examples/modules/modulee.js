import {Module,registModule} from '../../dist/nodom.js'

export class ModuleE extends Module{
    template(){
        // this.model.rows = this.props.$data.rows;
        return `
            <div style='border:solid 1px;'>
                <p>子模块e</p>
                <button e-click='change'>change</button>
                <button e-click='change1'>change1</button>
                <for cond={{rows}}>
                    <div>id is:{{id}},name is:<span style='color:red;font-weight:bold;padding-left:10px'>{{name}}</span></div>
                </for>
            </div>
        `
    }

    onBeforeFirstRender(){
        console.log(this.model);
    }

    change(){
        this.model.o2 = {name:'nodom'};
    }
    change1(){
        this.model.o2.name = 'nodom3';
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