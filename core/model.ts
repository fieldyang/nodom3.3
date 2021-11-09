import { ModelManager } from "./modelmanager";
import { Module } from "./module";
import { Util } from "./util";
/**
 * 模型类
 */
export class Model {
    /**
     * model key
     */
    public $key:any;
    /**
     * @param data 		数据
     * @param module 	模块对象
     * @returns         模型代理对象
     */
    constructor(data: any, module?: Module) {
        //模型管理器
        let proxy = new Proxy(data, {
            set: (src: any, key: string, value: any, receiver: any) => {
                //值未变,proxy 不处理
                if (src[key] === value) {
                    return true;
                }
                //不处理原型属性和构造器 
                if (['__proto__', 'constructor'].includes(<string>key)) {
                    return true;
                }
                const excArr = ["$key"];
                //非对象，null，非model更新渲染
                if(typeof value !== 'function' && excArr.indexOf(key) === -1){
                    ModelManager.update(proxy, key, src[key], value);
                }
                return Reflect.set(src, key, value, receiver);
            },
            get: (src: any, key: string | symbol, receiver) => {
                let res = Reflect.get(src, key, receiver);
                //数组的sort和fill触发强行渲染
                if(Array.isArray(src) && ['sort','fill'].indexOf(<string>key) !== -1){ //强制渲染
                    ModelManager.update(proxy,null,null,null,true);
                }
                let data = ModelManager.getFromDataMap(src[key]);
                if (data) {
                    return data;
                }
                
                if (res !== null && typeof res === 'object') {
                    //如果是对象，则返回代理，便于后续激活get set方法                   
                    //判断是否已经代理，如果未代理，则增加代理
                    if (!src[key].$key) {
                        let p = new Model(res, module);
                        return p;
                    }
                }
                return res;
            },
            deleteProperty: function (src: any, key: any) {
                //如果删除对象，从mm中同步删除
                if (src[key] !== null && typeof src[key] === 'object') {
                    ModelManager.delFromDataMap(src[key]);
                    ModelManager.delModel(src[key]);
                }
                delete src[key];
                ModelManager.update(proxy,key,null,null,true);
                return true;
            }
        });
        proxy.$watch = this.$watch;
        proxy.$get = this.$get;
        proxy.$set = this.$set;
        proxy.$key = Util.genId();
        ModelManager.addToDataMap(data, proxy);
        ModelManager.addModel(proxy, data);
        //绑定到模块
        if(module){
            ModelManager.bindToModule(proxy,module);
        }
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
        if (cancel) {
            ModelManager.removeWatcher(model, key, operate);
        } else {
            ModelManager.addWatcher(model, key, operate);
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
     * @param module    需要绑定的新模块
     */
    $set(key:string,value:any,module?:Module){
        let model: Model = this;
        let mids = ModelManager.getModuleIds(this);
        if (key.indexOf('.') !== -1) {    //层级字段
            let arr = key.split('.');
            for (let i = 0; i < arr.length - 1; i++) {
                //不存在，则创建新的model
                if (!model[arr[i]]) {
                    let m = new Model({});
                    ModelManager.bindToModules(m,mids);
                    model[arr[i]] = m;
                }
            }
            key = arr[arr.length - 1];
        }
        //绑定model到模块
        if(typeof value === 'object' && module){
            ModelManager.bindToModule(value,module);
        }
        model[key] = value;
    }
}