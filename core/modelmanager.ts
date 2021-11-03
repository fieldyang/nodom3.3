import { VirtualDom } from "./virtualdom";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { Renderer } from "./renderer";

/**
 * 模型工厂
 */
export class ModelManager {
    // public module: Module;
    /**
     * 数据对象与模型映射，key为数据对象，value为model
     */
    private static dataMap: WeakMap<object, Model> = new WeakMap();
    /**
     * 模型模块映射
     * key:model proxy, value:{data:data,watchers:{key:[监听器1,监听器2,...]},modules:[id1,id2,...]}
     * 每个数据对象，可有多个监听器
     */
    private static modelMap: WeakMap<Model, any> = new WeakMap();
    
    /**
     * 添加到 dataNModelMap
     * @param data      数据对象
     * @param model     模型
     */
    public static addToDataMap(data: Object, model: Model) {
        this.dataMap.set(data, model);
    }

    /**
     * 删除从 dataNModelMap
     * @param data      数据对象
     * @param model     模型
     */
    public static delFromDataMap(data: Object) {
        this.dataMap.delete(data);

    }

    /**
     * 从dataNModelMap获取model
     * @param data      数据对象
     * @returns         model
     */
    public static getFromDataMap(data: Object): Model {
        return this.dataMap.get(data);
    }

    /**
     * 是否存在数据模型映射
     * @param data  数据对象
     * @returns     true/false
     */
    public static hasDataModel(data: Object): Boolean {
        return this.dataMap.has(data);
    }


    /**
     * 添加源模型到到模型map
     * @param model     模型代理
     * @param srcNModel  源模型
     */
    public static addModel(model: any, srcNModel: Model) {
        if (!this.modelMap.has(model)) {
            this.modelMap.set(model, { model: srcNModel });
        } else {
            this.modelMap.get(model).model = srcNModel;
        }
    }
    /**
   * 删除源模型到到模型map
   * @param model     模型代理
   * @param srcNModel  源模型
   */
    public static delModel(model: any) {
        this.modelMap.delete(model);
    }
    /**
     * 从模型Map获取源数据
     * @param model     模型代理
     * @returns         源模型
     */
    public static getData(model: any): Model {
        if (this.modelMap.has(model)) {
            return this.modelMap.get(model).data;
        }
        return undefined;
    }

    /**
     * 获取model监听器
     * @param model     model
     * @param key       model对应的属性
     * @param foo       监听处理方法
     * @returns         void
     */
    public static addWatcher(model: Model, key: string, foo: Function | string) {
        // 把model加入到model map
        if (!this.modelMap.has(model)) {
            this.modelMap.set(model, {});
        }
        let watchers = this.modelMap.get(model).watchers;
        //添加watchers属性
        if (!watchers) {
            watchers = {};
            this.modelMap.get(model).watchers = watchers;
        }
        
        //添加观察器数组
        if (!watchers[key]) {
            watchers[key] = [foo];
        }else{
            //把处理函数加入观察器数组
            watchers[key].push(foo);
        }
    }

    /**
     * 获取model监听器
     * @param model     model
     * @param key       model对应的属性
     * @param foo       监听处理方法
     * @returns         void
     */
    public static removeWatcher(model: Model, key: string, foo: Function | string) {
        if (!this.modelMap.has(model) || !this.modelMap.get(model).watchers) {
            return;
        }
        let watchers = this.modelMap.get(model).watchers;
        if (!watchers[key]) {
            return;
        }
        let index = watchers[key].findIndex(foo);
        //找到后移除
        if (index !== -1) {
            watchers.splice(index, 1);
        }
    }

    /**
     * 获取model监听器
     * @param model     model
     * @param key       model对应的属性
     * @returns         监听处理函数数组
     */
    public static getWatcher(model: Model, key: string): Array<Function> {
        if (!this.modelMap.has(model)) {
            return;
        }
        let watchers = this.modelMap.get(model).watchers;
        if (watchers) {
            return watchers[key];
        }
    }

    /**
     * 绑定model到module
     * @param model     模型 
     * @param module    模块
     * @returns 
     */
    public static bindToModule(model:Model,module:Module|number){
        let obj = this.modelMap.get(model);
        if(!obj){
            return;
        }
        let mid = typeof module === 'number'?module:module.id;
        if(!obj.modules){
            obj.modules = [mid];
        }else{
            let arr = obj.modules;
            if(arr.indexOf(mid) === -1){
                arr.push(mid);
            }
        }
        //级联设置
        Object.getOwnPropertyNames(model).forEach(item=>{
            if(typeof model[item] === 'object' && model[item].$key){
                ModelManager.bindToModule(model[item],module);
            }
        });
    }

    /**
     * 绑定model到多个module
     * @param model     模型 
     * @param ids       模块id数组
     * @returns 
     */
     public static bindToModules(model:Model,ids:number[]){
        let obj = this.modelMap.get(model);
        if(!obj){
            return;
        }
        if(!obj.modules){
            obj.modules = ids;
        }else{
            let arr = obj.modules;
            for(let mid of ids){
                if(arr.indexOf(mid) === -1){
                    arr.push(mid);
                }
            }
        }

        //级联设置
        Object.getOwnPropertyNames(model).forEach(item=>{
            if(typeof model[item] === 'object' && model[item].$key){
                ModelManager.bindToModules(model[item],ids);
            }
        });
    }

    /**
     * model从module解绑
     * @param model     模型 
     * @param module    模块
     * @returns 
     */
     public static unbindFromModule(model:Model,module:Module|number){
        let obj = this.modelMap.get(model);
        if(!obj || !obj.modules){
            return;
        }
        let mid = typeof module === 'number'?module:module.id;
        let arr = obj.modules;
        let ind;
        if((ind=arr.indexOf(mid)) === -1){
            arr.splice(ind);
        }
        
        //级联解绑
        Object.getOwnPropertyNames(model).forEach(item=>{
            if(typeof model[item] === 'object' && model[item].$key){
                ModelManager.unbindFromModule(model[item],module);
            }
        });
    }

    /**
     * 获取model绑定的moduleId
     * @param model     模型
     * @returns model绑定的模块id数组
     */
    public static getModuleIds(model:Model):number[]{
        let obj = this.modelMap.get(model);
        if(!obj){
            return;
        }
        return obj.modules;
    }

    /**
     * 更新导致渲染
     * 如果不设置oldValue和newValue，则直接强制渲染
     * @param model     model
     * @param key       属性
     * @param oldValue  旧值
     * @param newValue  新值
     * @param force     强制渲染
     */
    public static update(model: Model, key: string, oldValue?: any, newValue?: VirtualDom, force?:boolean) {
        //处理观察器函数
        let obj = this.modelMap.get(model);
        if(!obj){
            return;
        }
        
        let mids = obj.modules;
        let modules = [];
        for(let mid of mids){
            let m = ModuleFactory.get(mid);
            modules.push(m);
            //增加修改标志
            m.changedModelMap.set(model.$key,true);
        }
        let watcher = this.getWatcher(model,key);
        if (watcher) {
            for (let foo of watcher) {
                for(let m of modules){
                    //方法名
                    if (typeof foo === 'string') {
                        foo = m.getMethod(foo);
                        if (foo) {
                            foo.call(m,model, oldValue, newValue);
                        }
                    } else {
                        foo.call(m,model, oldValue, newValue);
                    }
                }
            }
        }
        if(oldValue !== newValue || force){
            for(let m of modules){
                Renderer.add(m);
            }
        }
    }

}
