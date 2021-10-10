import { Module } from "./module";

/**
 * 工厂基类
 */
export class NFactory {
    /**
     * 模块名
     */
    private moduleId:number;
    /**
     * 工厂item对象
     */
    private items:Map<number|string,any> = new Map();
    
    /**
     * @param module 模块
     */
    constructor(module?:Module) {
        if (module !== undefined) {
            this.moduleId = module.id;
        }
    }

    /**
     * 添加到工厂
     * @param name 	item name
     * @param item	item
     */
    public add(name:string|number, item:any) {
        this.items.set(name,item);
    }

    /**
     * 获得item
     * @param name 	item name
     * @returns     item
     */
    public get(name:string|number):any{
        return this.items.get(name);
    }

    
    /**
     * 从容器移除
     * @param name 	item name
     */
    public remove(name:string|number) {
        this.items.delete(name);
    }

    /**
     * 是否拥有该项
     * @param name  item name
     * @return      true/false
     */
    public has(name:string|number):boolean{
        return this.items.has(name);
    }
}
