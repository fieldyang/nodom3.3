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
                //不进行赋值
                const excArr = ['$watch', "$moduleId", "$query", "$key"]
                if (typeof value !== 'object' || !value.$watch) {
                    //更新渲染
                    // src[key] = value;
                    if (typeof (value) != 'function' && excArr.indexOf(value) == -1)
                        mm.update(proxy, key, src[key], value);
                    return Reflect.set(src, key, value, receiver)
                }
                return Reflect.set(src, key, value, receiver)
            },
            get: (src: any, key: string | symbol, receiver) => {
                // vue 的做法是变异 push 等方法避免追踪length 
                // 但是我测试之后发现他还是会去追踪length
                // if (Array.isArray(src) && arrayFunc.hasOwnProperty(key)) {
                //     return Reflect.get(arrayFunc, key, receiver)
                // }
                let res = Reflect.get(src, key, receiver);
                let data = module.modelManager.getFromDataMap(src[key])
                if (data) {
                    return data
                }
                if (typeof res === 'object') {
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
            deleteProperty: function (target, key) {
                //如果删除对象，从mm中同步删除
                if (target[key] != null && typeof target[key] === 'object') {
                    mm.delToDataMap(target[key]);
                    mm.delModelToModelMap(target[key]);
                }
                delete target[key];
                return true;
            }
        });
        proxy.$watch = this.$watch;
        proxy.$moduleId = module.id;
        proxy.$query = this.$query;
        proxy.$key = Util.genId();;
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
            model = this.$query(key.substr(0, index));
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
    $query(key: string) {
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
}
