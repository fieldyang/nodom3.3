import { Set } from "../node_modules/typescript/lib/typescript";
import { Element } from "./element";
import { ModelManager } from "./modelmanager";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import {Util}   from "./util";
/**
 * 模型类
 */
export class Model{
    /**
     * 模块id
     */
    $moduleId:number;
    $ob:Map<String,Array<Element>>;
    /**
     * @param data 		数据
     * @param module 	模块对象
     * @returns         模型代理对象
     */
    constructor(data: any, module: Module){
        //模型管理器
        let mm:ModelManager = module.modelManager;
        let proxy = new Proxy(data,{
            set:(src:any,key:string,value:any,receiver:any)=>{
                //值未变,proxy 不处理
                if(src[key] === value){
                    return true;
                }
                //不处理原型属性
                let excludes = ['__proto__','constructor'];
                //数组不处理长度
                if(Array.isArray(src)){
                  if(key==='length'){
                    src[key] = value;
                    return true;
                  }
                }
                if(excludes.includes(<string>key)){
                    return true;
                }
                //yi不进行赋值
                if(typeof value !== 'object' || !value.$watch){
                  
                    //更新渲染
                    if(typeof value !='function'&&!key.startsWith('$')){
                        mm.update(proxy,key,src[key],value);
                    }
                    src[key] = value;
                    // if(typeof value !='function'&&!key.startsWith('$'))
                    // mm.dataRender(proxy,key);
                }
                return true;
            },
            get:(src:any,key:string|symbol,receiver)=>{
                //如果是对象，则返回代理，便于后续激活get set方法
                if(typeof src[key] === 'object'&&src[key]!='$ob'){
                    //判断是否已经代理，如果未代理，则增加代理
                    if(!src[key].$watch){
                        let p = new Model(src[key],module);
                        receiver[key] = p;
                        return p;
                    }else{
                        return module.modelManager.getFromDataMap(src[key]);
                    }
                }
                return src[key];
            }
        });
        proxy.$watch = this.$watch;
        proxy.$moduleId = module.id;
        proxy.$query = this.$query;
        proxy.$key=Util.genId();
        mm.addObserveMap(proxy);
        mm.addToDataMap(data,proxy);
        mm.addModelToModelMap(proxy,data);
        return proxy;
    }

    /**
     * 观察(取消观察)某个数据项
     * @param key       数据项名
     * @param operate   数据项变化时执行方法名(在module的methods中定义)
     * @param cancel    取消观察
     */
    public $watch(key:string,operate:string|Function,cancel?:boolean){
        let model = this;
        let index = -1;
        //如果带'.'，则只取最里面那个对象
        if((index = key.lastIndexOf('.')) !== -1){
            model = this.$query(key.substr(0,index));
            key = key.substr(index+1);
        }
        if(!model){
            return;
        }
        const mod = ModuleFactory.get(this.$moduleId);
        if(cancel){
            mod.modelManager.removeWatcherFromModelMap(model,key,operate);
        }else{
            mod.modelManager.addWatcherToModelMap(model,key,operate);
        }
    }
    /**
     * 查询子属性
     * @param key   子属性，可以分级，如 name.firstName
     * @returns     属性对应model proxy
     */
    $query(key:string){
        let model:Model = this;
        if(key.indexOf('.') !== -1){    //层级字段
            let arr = key.split('.');
            for(let i=0;i<arr.length-1;i++){
                model = model[arr[i]];
                if(!model){
                    break;
                }
            }
            if(!model){
                return;
            }
            key = arr[arr.length-1];
        }
        return model[key];
    }
}
