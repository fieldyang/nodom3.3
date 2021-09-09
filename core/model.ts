import { ModuleFactory } from "../index";
import { ModelManager } from "./modelmanager";
import { Module } from "./module";
import { Util } from "./util";
/**
 * 模型类
 */

export const modelCloneExpKey = ["$moduleId", "$key", "$watch", "$query"]

export class Model {
    /**
     * 模块id
     */
    $moduleId: number;


    /**
     * @param data 		数据
     * @param module 	模块对象
     * @returns         模型代理对象
     */
    constructor(data: any, module: Module) {
        //模型管理器
        let mm: ModelManager = module.modelManager;

        let proxy = new Proxy(data, {
            set: (src: any, key: string, value: any, receiver: any) => {
                //值未变,proxy 不处理
                if (src[key] === value) {
                    return true;
                }
                //不处理原型属性 
                let excludes = ['__proto__', 'constructor'];
                if (excludes.includes(<string>key)) {
                    return true;
                }
                const excArr = ['$watch', "$moduleId", "$set","$get", "$key", "$index"];
                //不进行赋值
                if (typeof value !== 'object' || (value === null || !value.$watch)) {
                    //更新渲染
                    if (excArr.indexOf(key) == -1) {
                        mm.update(proxy, key, src[key], value);
                    }
                }
                return Reflect.set(src, key, value, receiver);
            },
            get: (src: any, key: string | symbol, receiver) => {
                let res = Reflect.get(src, key, receiver);
                //数组的sort和fill触发强行渲染
                if(Array.isArray(src) && ['sort','fill'].indexOf(<string>key) !== -1){
                    setTimeout(()=>{
                        mm.update(proxy,<string>key);
                    },0)
                }
                let data = module.modelManager.getFromDataMap(src[key]);
                if (data) {
                    return data;
                }
                
                if (res !== null && typeof res === 'object') {
                    //如果是的对象，则返回代理，便于后续激活get set方法                   
                    // 判断是否已经代理，如果未代理，则增加代理
                    if (!src[key].$watch) {
                        let p = new Model(res, module);
                        // receiver[key] = p;
                        return p;
                    }
                    // else {
                    //     let data = module.modelManager.getFromDataMap(src[key]);
                    //     return data ? data : res;
                    // }
                }
                return res;
            },
            deleteProperty: function (src: any, key: any) {
                //如果删除对象，从mm中同步删除
                if (src[key] != null && typeof src[key] === 'object') {
                    mm.delToDataMap(src[key]);
                    mm.delModelToModelMap(src[key]);
                }
                delete src[key];
                return true;
            }
        });
        proxy.$watch = this.$watch;
        proxy.$moduleId = module.id;
        proxy.$get = this.$get;
        proxy.$set = this.$set;
        proxy.$key = Util.genId();
        mm.addToDataMap(data, proxy);
        mm.addModelToModelMap(proxy, data);
        return proxy;
    }


    /**
     * 观察(取消观察)某个数据项
     * @param key       数据项名
     * @param operate   数据项变化时执行方法名(在module的methods中定义)
     * @param cancel    取消观察
     */
    public $watch(key: string, operate: string | Function, cancel?: boolean) {
        let model = this;
        let index = -1;
        //如果带'.'，则只取最里面那个对象
        if ((index = key.lastIndexOf('.')) !== -1) {
            model = this.$get(key.substr(0, index));
            key = key.substr(index + 1);
        }
        if (!model) {
            return;
        }
        const mod = ModuleFactory.get(this.$moduleId);
        if (cancel) {
            mod.modelManager.removeWatcherFromModelMap(model, key, operate);
        } else {
            mod.modelManager.addWatcherToModelMap(model, key, operate);
        }
    }
    /**
     * 查询子属性
     * @param key   子属性，可以分级，如 name.firstName
     * @returns     属性对应model proxy
     */
    $get(key: string) {
        let model: Model = this;
        if (key.indexOf('.') !== -1) {    //层级字段
            let arr = key.split('.');
            for (let i = 0; i < arr.length - 1; i++) {
                model = model[arr[i]];
                if (!model) {
                    break;
                }
            }
            if (!model) {
                return;
            }
            key = arr[arr.length - 1];
        }
        return model[key];
    }

    /**
     * 设置值
     * @param key       子属性，可以分级，如 name.firstName
     * @param value     属性值
     */
    $set(key:string,value:any){
        let model: Model = this;
        if (key.indexOf('.') !== -1) {    //层级字段
            let arr = key.split('.');
            for (let i = 0; i < arr.length - 1; i++) {
                //不存在，则创建新的model
                if (!model[arr[i]]) {
                    model[arr[i]] = new Model({},ModuleFactory.get(this.$moduleId));
                }
            }
            key = arr[arr.length - 1];
        }
        model[key] = value;
    }

    /**
     * 执行模块方法
     * @param methodName    方法名
     * @param args          参数数组
     */
    $call(methodName:string,args:any[]){
        let module:Module = ModuleFactory.get(this.$moduleId);
        return module.invokeMethod(methodName,args);
    }
}