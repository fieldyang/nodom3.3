import {Module} from '../../../dist/nodom.js'

export class ModuleA extends Module {
    template(){
        return `
            <div>
                <h1>这是modulea</h1>
                
                <ul>
                    <li x-repeat={{foods}} class='item'>{{name}}</li>
                </ul>
            </div>
        `
    }
    model={
        foods:[
            {name:'duck'},
            {name:'fish'}
        ]
    }
}