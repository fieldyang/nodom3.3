import { Application } from "./application";
import { NError } from "./error";
import { Model } from "./model";
import { Module } from "./module";
import { NodomMessage, store } from "./nodom";
import { ResourceManager } from "./resourcemanager";
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

    /**
     * 添加模块类
     * @param modules 
     */
    public static async addModules(modules: Array<IMdlClassObj>) {
        for (let cfg of modules) {
            if (!cfg.path) {
                throw new NError("paramException", 'modules', 'path');
            }
            if (!cfg.class) {
                throw new NError("paramException", 'modules', 'class');
            }
            //lazy默认true
            if (cfg.lazy === undefined) {
                cfg.lazy = true;
            }
            //singleton默认true
            if (cfg.singleton === undefined) {
                cfg.singleton = true;
            }
            if (!cfg.lazy) {
                await this.initModule(cfg);
            }
            //存入class工厂
            this.classes.set(cfg.class, cfg);
        }
    }

    /**
     * 初始化模块
     * @param cfg 模块类对象
     */
    private static async initModule(cfg: IMdlClassObj) {
        //增加 .js后缀
        let path: string = cfg.path;
        if (!path.endsWith('.js')) {
            path += '.js';
        }
        //加载模块类js文件
        let url: string = Util.mergePath([Application.getPath('module'), path]);
        await ResourceManager.getResources([{ url: url, type: 'js' }]);
        // let cls = eval(cfg.class);
        let cls = Util.eval(cfg.class);
        if (cls) {
            let instance = Reflect.construct(cls, [{
                name: cfg.name,
                data: cfg.data,
                lazy: cfg.lazy
            }]);
            if (store) {
                instance.store = store;
            }
            //模块初始化
            await instance.init();
            cfg.instance = instance;
            //单例，则需要保存到modules
            if (cfg.singleton) {
                this.modules.set(instance.id, instance);
            }
            //初始化完成
            delete cfg.initing;
        } else {
            throw new NError('notexist1', NodomMessage.TipWords['moduleClass'], cfg.class);
        }
    }
}
