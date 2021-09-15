import { Module } from "./module";
import { Element } from "./Element";
import { Compiler } from "./compiler";

/**
 * 过滤器工厂，存储模块过滤器
 */
export class ModuleFactory {
    /**
     * 模块对象工厂 {moduleId:{key:容器key,className:模块类名,instance:模块实例}}
     */
    private static modules: Map<number, Module> = new Map();

    /**
     * 模块类集合 {className:instance}
     */
    public static classes: Map<string, Module> = new Map();

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
            this.mainModule = item;
        }
        this.modules.set(item.id, item);

        //加入模块类map
        if(!this.classes.has(item.constructor.name)){
            this.classes.set(item.constructor.name,item);
        }
    }

    /**
     * 获得模块
     * @param name  类、类名或实例id
     * @param props 传递给子模块的外部属性(用于产生模版)
     */
    public static get(name:any,props?:any): Module {
        if(typeof name === 'number'){
            return this.modules.get(name);
        }else{
            return this.getInstance(name,props);
        }
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
     * @param props         模块外部属性
     */
    private static getInstance(clazz:any,props?:any): Module {
        let className = (typeof clazz === 'string')?clazz:clazz.name;
        // 初始化模块
        if(!this.classes.has(className) && typeof clazz === 'function'){
            Reflect.construct(clazz,[]);
        }
        let src = this.classes.get(className);
        if(!src){
            return;
        }
        
        // 模块实例
        let instance;
        //未初始化
        if(src.state === 0){
            src.init();
            instance = src;
        }else{
            instance = src.clone();
            console.log(instance.virtualDom);
        }
        if(src.template){
            let tp = src.template.apply(src.model,[props]);
            let root:Element;
            //当返回为数组时，如果第二个参数为true，则表示不再保留模版函数
            if(Array.isArray(tp)){
                root = Compiler.compile(tp[0],src);
                if(tp.length>1 && tp[1]){
                    src.virtualDom = root;
                    delete src.template;
                }
            }else{ //只返回编译串
                root = Compiler.compile(tp,src);
            }
            instance.virtualDom = root;
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
