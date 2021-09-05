import {Module} from '../../../dist/nodom.js'

export class MIndex extends Module {
    template(){
        return `
            <div>
                <div>这是index</div>
                <a x-route=/router/r1>to r1</a>
                <div x-router></div>
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