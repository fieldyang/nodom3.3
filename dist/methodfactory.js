import { NError } from "./error";
import { NFactory } from "./factory";
import { Nodom } from "./nodom";
import { Util } from "./util";
/**
 * 方法工厂，每个模块一个
 */
export class MethodFactory extends NFactory {
    /**
     * 调用方法
     * @param name 		方法名
     * @param params 	方法参数数组
     */
    invoke(name, params) {
        const foo = this.get(name);
        if (!Util.isFunction(foo)) {
            throw new NError(Nodom.tipMessage.ErrorMsgs['notexist1'], Nodom.tipMessage.TipWords['method'], name);
        }
        return Util.apply(foo, this.module.model, params);
    }
}
//# sourceMappingURL=methodfactory.js.map