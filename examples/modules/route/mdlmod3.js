import {Module} from '../../../dist/nodom.js'
/**
 * 路由主模块
 */
export class MdlMod3 extends Module {
    template(){
        return "<div>这是数据页,路径是{{$route.path}}</div>";
    }
}
