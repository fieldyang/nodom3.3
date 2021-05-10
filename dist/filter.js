import { FilterManager } from "./filtermanager";
import { Util } from "./util";
/**
 * 过滤器类
 */
export class Filter {
    /**
     * 构造方法
     * @param src 		源串，或explain后的数组
     */
    constructor(src) {
        if (src) {
            let arr = Util.isString(src) ? FilterManager.explain(src) : src;
            if (arr) {
                this.type = arr[0];
                this.params = arr.slice(1);
            }
        }
    }
    /**
     * 过滤器执行
     * @param value 	待过滤值
     * @param module 	模块
     * @returns 		过滤结果
     */
    exec(value, module) {
        let args = [module, this.type, value].concat(this.params);
        return Util.apply(FilterManager.exec, module, args);
    }
    /**
     * 克隆
     */
    clone() {
        let filter = new Filter();
        filter.type = this.type;
        if (this.params) {
            filter.params = Util.clone(this.params);
        }
        return filter;
    }
}
//# sourceMappingURL=filter.js.map