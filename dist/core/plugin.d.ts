import { Element } from "./element";
import { Model } from "./model";
import { Module } from "./module";
/**
 * 插件，插件为自定义元素方式实现
 */
export declare class Plugin {
    /**
     * tag name
     */
    tagName: string;
    /**
     * 绑定的element
     */
    element: Element;
    /**
     * module id
     */
    moduleId: number;
    /**
     * model
     */
    model: Model;
    /**
     * 绑定的dom key
     */
    key: string;
    /**
     * 插件名，在module中唯一
     */
    name: string;
    /**
     * 是否需要前置渲染
     */
    needPreRender: boolean;
    /**
     * 附加数据项名
     */
    extraDataName: string;
    constructor(params: HTMLElement | Object);
    /**
     * 前置渲染方法(dom render方法中获取modelId和parentKey后执行)
     * @param module    模块
     * @param uidom     虚拟dom
     */
    beforeRender(module: Module, uidom: Element): void;
    /**
     * 后置渲染方法(dom render结束后，选到html之前)
     * @param module    模块
     * @param uidom     虚拟dom
     */
    afterRender(module: Module, uidom: Element): void;
    /**
     * 克隆
     */
    clone(dst?: Element): any;
    /**
     * 获取model
     */
    getModel(): Model;
}
