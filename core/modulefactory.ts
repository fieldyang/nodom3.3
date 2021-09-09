import { Model } from "./model";
import { Module } from "./module";
import { IMdlClassObj, IModuleCfg } from "./types";
import { Util } from "./util";

/**
 * 过滤器工厂，存储模块过滤器
 */
export class ModuleFactory {
    /**
     * 模块对象工厂 {moduleId:{key:容器key,className:模块类名,instance:模块实例}}
     */
    private static modules: Map<number, Module> = new Map();

    /**
     * 模块类集合
     */
    private static classes: Map<string, IMdlClassObj> = new Map();

    /**
     * 主模块
     */
    private static mainModule: Module;
    /**
     * 添加模块到工厂
     * @param id    模块id
     * @param item  模块存储对象
     */
    public static add(item: Module) {
        //第一个为主模块
        if(this.modules.size === 0){
            this.mainModule = item
        }
        this.modules.set(item.id, item);
    }

    /**
     * 获得模块
     * @param id    模块id
     */
    public static get(id: number): Module {
        return this.modules.get(id);
    }

    /**
     * 是否存在模块类
     * @param clazzName     模块类名
     * @returns     true/false
     */
    public static has(clazzName:string):boolean{
        return this.classes.has(clazzName);
    }

    /**
     * 获取模块实例（通过类名）
     * @param className     模块类名
     * @param moduleName    模块名
     * @param config        模块配置项
     */
    public static getInstance(clazz: any, moduleName?: string,config?:IModuleCfg): Module {
        let instance;
        let className:string = (typeof clazz === 'function'?clazz.name:clazz);
        if(!this.classes.has(className)){
            config = config || {};
            instance = Reflect.construct(clazz,[config]);
            instance.init();
            this.classes.set(className,{
                instance:instance,
                model:instance.model
            });
        }else{
            let cfg = this.classes.get(className);
            //克隆模块
            instance = cfg.instance.clone(moduleName);
            //克隆原始数据
            if(cfg.model){
                instance.model = new Model(Util.clone(cfg.model),instance);
            }
        }
        return instance;
    }
    /**
     * 从工厂移除模块
     * @param id    模块id
     */
    static remove(id: number) {
        this.modules.delete(id);
    }
    /**
     * 设置主模块
     * @param m 	模块 
     */
    static setMain(m: Module) {
        this.mainModule = m;
    }

    /**
     * 获取主模块
     * @returns 	应用的主模块
     */
    static getMain() {
        return this.mainModule;
    }
}
