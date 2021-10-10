import { Module } from "./module";

/**
 * 过滤器工厂，存储模块过滤器
 */
export class ModuleFactory {
    /**
     * 模块对象工厂 {moduleId:{key:容器key,className:模块类名,instance:模块实例}}
     */
    private static modules: Map<number, Module> = new Map();

    /**
     * 模块类集合 {className:class}
     */
    public static classes: Map<string, any> = new Map();

    /**
     * 主模块
     */
    private static mainModule: Module;
    /**
     * 添加模块到工厂
     * @param item  模块对象
     */
    public static add(item:Module) {
        // //第一个为主模块
        if(this.modules.size === 0){
            this.mainModule = item;
        }
        this.modules.set(item.id, item);

        //添加模块类
        this.addClass(item.constructor);
    }

    /**
     * 获得模块
     * @param name  类、类名或实例id
     */
    public static get(name:any): Module {
        if(typeof name === 'number'){
            return this.modules.get(name);
        }else{
            return this.getInstance(name);
        }
    }

    /**
     * 是否存在模块类
     * @param clazzName     模块类名
     * @returns     true/false
     */
    public static hasClass(clazzName:string):boolean{
        return this.classes.has(clazzName);
    }

    /**
     * 添加模块类
     * @param clazz     模块类
     * @param name      注册别名
     */
    public static addClass(clazz:any,name?:string){
        if(this.classes.has(clazz.name)){
            return;
        }
        this.classes.set(clazz.name,clazz);
        if(name){
            this.classes.set(name,clazz);
        }
    }

    /**
     * 获取模块实例（通过类名）
     * @param className     模块类或类名
     * @param props         模块外部属性
     */
    private static getInstance(clazz:any): Module {
        let className = (typeof clazz === 'string')?clazz:clazz.name;
        let cls;
        // 初始化模块
        if(!this.classes.has(className) && typeof clazz === 'function'){
            cls = clazz;
        }else{
            cls = this.classes.get(className);
        }
        
        if(!cls){
            return;
        }

        let m:Module = Reflect.construct(cls, []);
        m.init();
        return m;
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
