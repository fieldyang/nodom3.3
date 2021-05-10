import { Model } from "./model";
/**
 * 表达式类
 */
export declare class Expression {
    /**
      * 表达式id
      */
    id: number;
    /**
     * 字段数组
     */
    fields: Array<string>;
    /**
     * 执行函数
     */
    execFunc: Function;
    /**
     * @param exprStr	表达式串
     */
    constructor(exprStr?: string);
    /**
     * 克隆
     */
    clone(): this;
    /**
     * 初始化，把表达式串转换成堆栈
     * @param exprStr 	表达式串
     */
    compile(exprStr: string): string;
    /**
     * 表达式计算
     * @param model 	模型 或 fieldObj对象
     * @returns 		计算结果
     */
    val(model: Model): any;
    /**
    * 添加字段到fields
    * @param field 	字段
    * @returns         true/false
    */
    private addField;
}
