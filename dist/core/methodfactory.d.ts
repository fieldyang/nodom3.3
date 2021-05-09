import { NFactory } from "./factory";
/**
 * 方法工厂，每个模块一个
 */
export declare class MethodFactory extends NFactory {
    private module;
    /**
     * 调用方法
     * @param name 		方法名
     * @param params 	方法参数数组
     */
    invoke(name: string, params: Array<any>): any;
}
