import {Module} from '../../../dist/nodom.js'
export class MdlPMod3 extends Module {
    template(){
        return `
            <div class='result code1'>
            <div style='border-bottom: 1px solid #999'>
                <a x-route='/router/route3/r1/r2'>加载子路由r2</a>
            </div>
            <div x-router test='3'></div>
        </div>
        `
<<<<<<< HEAD
    }
    data = {} 
=======
    } 
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
}