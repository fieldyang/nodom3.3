import { ModuleFactory } from "./modulefactory";
/**
 * 模型类
 */
export class Model {
    /**
     * @param data 		数据
     * @param module 	模块对象
     * @returns         模型代理对象
     */
    constructor(data, module) {
        //模型管理器
        let mm = module.modelManager;
        let proxy = new Proxy(data, {
            set: (src, key, value, receiver) => {
                //值未变,proxy 不处理
                if (src[key] === value) {
                    return true;
                }
                //不处理原型属性
                let excludes = ['__proto__', 'constructor'];
                //数组不处理长度
                if (Array.isArray(src)) {
                    excludes.push('length');
                }
                if (excludes.includes(key)) {
                    return true;
                }
                //yi不进行赋值
                if (typeof value !== 'object' || !value.$watch) {
                    //更新渲染
                    mm.update(proxy, key, src[key], value);
                    src[key] = value;
                }
                return true;
            },
            get: (src, key, receiver) => {
                //如果是对象，则返回代理，便于后续激活get set方法
                if (typeof src[key] === 'object') {
                    //判断是否已经代理，如果未代理，则增加代理
                    if (!src[key].$watch) {
                        let p = new Model(src[key], module);
                        receiver[key] = p;
                        return p;
                    }
                    else {
                        return module.modelManager.getFromDataMap(src[key]);
                    }
                }
                return src[key];
            }
        });
        proxy.$watch = this.$watch;
        proxy.$moduleId = module.id;
        proxy.$query = this.$query;
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
    $watch(key, operate, cancel) {
        let model = this.$query(key);
        if (!model) {
            return;
        }
        let mod = ModuleFactory.get(this.$moduleId);
        if (cancel) {
            mod.modelManager.removeWatcherFromModelMap(model, key, operate);
        }
        else {
            mod.modelManager.addWatcherToModelMap(model, key, operate);
        }
    }
    /**
     * 查询子属性
     * @param key   子属性，可以分级，如 name.firstName
     * @returns     属性对应model proxy
     */
    $query(key) {
        let model = this;
        if (key.indexOf('.') !== -1) { //层级字段
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
        else {
            return model[key];
        }
    }
}
//# sourceMappingURL=model.js.map