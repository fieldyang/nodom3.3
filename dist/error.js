import { Nodom } from "./nodom";
import { Util } from "./util";
/**
 * 异常处理类
 * @since       1.0.0
 */
export class NError extends Error {
    constructor(errorName, p1, p2, p3, p4) {
        super(errorName);
        let msg = Nodom.tipMessage.ErrorMsgs[errorName];
        if (msg === undefined) {
            this.message = "未知错误";
            return;
        }
        //复制请求参数
        let params = [msg];
        for (let i = 1; i < arguments.length; i++) {
            params.push(arguments[i]);
        }
        this.message = Util.compileStr.apply(null, params);
    }
}
//# sourceMappingURL=error.js.map