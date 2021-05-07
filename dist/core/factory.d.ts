import { Module } from "./module";
/**
 * 工厂基类
 */
export declare class NFactory {
    /**
     * 模块名
     */
    private moduleId;
    /**
     * 工厂item对象
     */
    private items;
    /**
     * @param module 模块
     */
    constructor(module?: Module);
    /**
     * 添加到工厂
     * @param name 	item name
     * @param item	item
     */
    add(name: string | number, item: any): void;
    /**
     * 获得item
     * @param name 	item name
     * @returns     item
     */
    get(name: string | number): any;
    /**
     * 从容器移除
     * @param name 	item name
     */
    remove(name: string | number): void;
    /**
     * 是否拥有该项
     * @param name  item name
     * @return      true/false
     */
    has(name: string | number): boolean;
}
