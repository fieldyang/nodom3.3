import { NError } from "./error";
import { NFactory } from "./factory";
import { NodomMessage } from "./nodom";
import { Module } from "./module";
import { Util } from "./util";

/**
 * 方法工厂
 */
export class MethodFactory extends NFactory {
    private module:Module;
    /**
     * 调用方法
     * @param name 		方法名
     * @param params 	方法参数数组
     */
    public invoke(name:string, params:Array<any>) {
        const foo = this.get(name);
        if (!Util.isFunction(foo)) {
            throw new NError(NodomMessage.ErrorMsgs['notexist1'], NodomMessage.TipWords['method'], name);
        }
        return Util.apply(foo, this.module.model, params);
    }
}
