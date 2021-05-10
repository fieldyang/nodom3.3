import { Model } from "./model";
import { Module } from "./module";
/**
 * 模型工厂
 */
export declare class ModelManager {
    private module;
    /**
     * 数据对象与模型映射，key为数据对象，value为model
     */
    private dataMap;
    /**
     * 模型模块映射
     * key:model proxy, value:{model:model,watchers:{key:[监听器1,监听器2,...]}}
     * 每个数据对象，可有多个监听器
     */
    private modelMap;
    constructor(module: Module);
    /**
     * 添加到 dataNModelMap
     * @param data      数据对象
     * @param model     模型
     */
    addToDataMap(data: Object, model: Model): void;
    /**
     * 从dataNModelMap获取model
     * @param data      数据对象
     * @returns         model
     */
    getFromDataMap(data: Object): Model;
    /**
     * 是否存在数据模型映射
     * @param data  数据对象
     * @returns     true/false
     */
    hasDataNModel(data: Object): Boolean;
    /**
     * 添加源模型到到模型map
     * @param model     模型代理
     * @param srcNModel  源模型
     */
    addModelToModelMap(model: any, srcNModel: Model): void;
    /**
     * 从模型Map获取源模型
     * @param model     模型代理
     * @returns         源模型
     */
    getModelFromModelMap(model: any): Model;
    /**
     * 获取model监听器
     * @param model     model
     * @param key       model对应的属性
     * @param foo       监听处理方法
     * @returns         void
     */
    addWatcherToModelMap(model: Model, key: string, foo: Function | string): void;
    /**
     * 获取model监听器
     * @param model     model
     * @param key       model对应的属性
     * @param foo       监听处理方法
     * @returns         void
     */
    removeWatcherFromModelMap(model: Model, key: string, foo: Function | string): void;
    /**
     * 获取model监听器
     * @param model     model
     * @param key       model对应的属性
     * @returns         监听处理函数数组
     */
    getWatcherFromModelMap(model: Model, key: string): Array<Function>;
    /**
     * 更新导致渲染
     * @param model     model
     * @param key       属性
     * @param oldValue  旧值
     * @param newValue  新值
     */
    update(model: Model, key: string, oldValue: any, newValue: any): void;
}
//# sourceMappingURL=modelmanager.d.ts.map