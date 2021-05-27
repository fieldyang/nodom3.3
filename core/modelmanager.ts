import { Element } from "./element";
import { Model } from "./model";
import { Module } from "./module";
import { Renderer } from "./renderer";

/**
 * 模型工厂
 */
export class ModelManager {
    public module: Module;
    /**
     * 数据对象与模型映射，key为数据对象，value为model
     */
    private dataMap: WeakMap<object, Model> = new WeakMap();

    /**
     * 模型模块映射
     * key:model proxy, value:{model:model,watchers:{key:[监听器1,监听器2,...]}}
     * 每个数据对象，可有多个监听器
     */
    private modelMap: WeakMap<Model, any> = new WeakMap();
    private observeMap:WeakMap<Model,Map<String,Array<Element>>>= new WeakMap();

    constructor(module: Module) {
        this.module = module;
    }


    public addObserveMap(model:Model,key?:string,element?:any){
        let keyMap= this.observeMap.get(model)?this.observeMap.get(model):new Map();
        //添加依赖  
        if(key !=undefined&&element!=undefined){
            let elements= keyMap.get(key)?keyMap.get(key):new Array();
            let flag=true;
            if(elements.length>0){
                elements.forEach((item,index)=> {
                    if(item.key===element.key){
                        Array.prototype.splice(index,1,element);
                        flag=false;
                    }
                });
            }
            if(flag) elements.push(element);
            keyMap.set(key,elements);
        }
        this.observeMap.set(model,keyMap);
        
        
    }


    /**
     * 添加到 dataNModelMap
     * @param data      数据对象
     * @param model     模型
     */
    public addToDataMap(data: Object, model: Model) {
        this.dataMap.set(data, model);
    }


    /**
     * 从dataNModelMap获取model
     * @param data      数据对象
     * @returns         model
     */
    public getFromDataMap(data: Object): Model {
        return this.dataMap.get(data);
    }

    /**
     * 是否存在数据模型映射
     * @param data  数据对象
     * @returns     true/false
     */
    public hasDataNModel(data: Object): Boolean {
        return this.dataMap.has(data);
    }


    /**
     * 添加源模型到到模型map
     * @param model     模型代理
     * @param srcNModel  源模型
     */
    public addModelToModelMap(model: any, srcNModel: Model) {
        if (!this.modelMap.has(model)) {
            this.modelMap.set(model, { model: srcNModel });
        } else {
            this.modelMap.get(model).model = srcNModel;
        }
    }

    /**
     * 从模型Map获取源模型
     * @param model     模型代理
     * @returns         源模型
     */
    public getModelFromModelMap(model: any): Model {
        if (this.modelMap.has(model)) {
            return this.modelMap.get(model).model;
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
    public addWatcherToModelMap(model: Model, key: string, foo: Function | string) {
        // 把model加入到model map
        if (!this.modelMap.has(model)) {
            this.modelMap.set(model, {});
        }
        //添加watchers属性
        if (!this.modelMap.get(model).watchers) {
            this.modelMap.get(model).watchers = Object.create(null);
        }
        let watchers = this.modelMap.get(model).watchers;
        //添加观察器数组
        if (!watchers[key]) {
            watchers[key] = [];
        }
        //把处理函数加入观察器数组
        watchers[key].push(foo);
    }

    /**
     * 获取model监听器
     * @param model     model
     * @param key       model对应的属性
     * @param foo       监听处理方法
     * @returns         void
     */
    public removeWatcherFromModelMap(model: Model, key: string, foo: Function | string) {
        if (!this.modelMap.has(model)) {
            return;
        }
        if (!this.modelMap.get(model).watchers) {
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
    public getWatcherFromModelMap(model: Model, key: string): Array<Function> {
        if (!this.modelMap.has(model)) {
            return undefined;
        }
        let watchers = this.modelMap.get(model).watchers;
        if (watchers) {
            return watchers[key];
        }
    }

    /**
     * 更新导致渲染
     * @param model     model
     * @param key       属性
     * @param oldValue  旧值
     * @param newValue  新值
     */
    public update(model: Model, key: string, oldValue: any, newValue: Element) {
            
        Renderer.add(this.module);
        //处理观察器函数
        let watcher = this.getWatcherFromModelMap(model, key);
        if (watcher) {
            for (let foo of watcher) {
                //方法名
                if (typeof foo === 'string') {
                    if (this.module) {
                        foo = this.module.getMethod(foo);
                        if (foo) {
                            foo.call(model, oldValue, newValue);
                        }
                    }
                } else {
                    foo.call(model, oldValue, newValue);
                }
            }
        }
    }

    // public dataRender(model: Model, key: string){
    //     let renderElements =this.observeMap.get(model).get(key);
    //     if(renderElements!==undefined){
    //         renderElements.forEach((v)=>{
    //             console.log('dataRender');
                
    //               v.dataRender(v,this.module);
    //          })
    //     }else{
    //         console.log('render');
            
    //         Renderer.add(this.module);
    //     } 
    // }
}
