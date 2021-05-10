var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Application } from "./application";
import { NError } from "./error";
import { Nodom } from "./nodom";
import { Model } from "./model";
import { ResourceManager } from "./resourcemanager";
import { Util } from "./util";
/**
 * 过滤器工厂，存储模块过滤器
 */
export class ModuleFactory {
    /**
     * 添加模块到工厂
     * @param id    模块id
     * @param item  模块存储对象
     */
    static add(item) {
        this.modules.set(item.id, item);
    }
    /**
     * 获得模块
     * @param id    模块id
     */
    static get(id) {
        return this.modules.get(id);
    }
    /**
     * 获取模块实例（通过类名）
     * @param className     模块类名
     * @param moduleName    模块名
     * @param data          数据或数据url
     */
    static getInstance(className, moduleName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.classes.has(className)) {
                throw new NError('notexist1', Nodom.tipMessage.TipWords['moduleClass'], className);
            }
            let cfg = this.classes.get(className);
            if (moduleName) {
                cfg.name = moduleName;
            }
            if (!cfg.instance) {
                let id = Util.genId();
                if (!cfg.initing) {
                    cfg.initing = true;
                    this.initModule(cfg);
                }
                return new Promise((res, rej) => {
                    check();
                    function check() {
                        if (!cfg.initing) {
                            res(get(cfg));
                        }
                        else {
                            setTimeout(check, 0);
                        }
                    }
                });
            }
            else {
                return get(cfg);
            }
            function get(cfg) {
                if (cfg.singleton) {
                    return cfg.instance;
                }
                else {
                    let mdl = cfg.instance.clone(moduleName);
                    //处理数据
                    if (data) {
                        //如果为url，则设置dataurl和loadnewdata标志
                        if (typeof data === 'string') {
                            mdl.setDataUrl(data);
                        }
                        else { //数据模型化
                            mdl.model = new Model(data, mdl);
                        }
                    }
                    return mdl;
                }
            }
        });
    }
    /**
     * 从工厂移除模块
     * @param id    模块id
     */
    static remove(id) {
        this.modules.delete(id);
    }
    /**
     * 设置主模块
     * @param m 	模块
     */
    static setMain(m) {
        this.mainModule = m;
        m.setMain();
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
    static addModules(modules) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    yield this.initModule(cfg);
                }
                //存入class工厂
                this.classes.set(cfg.class, cfg);
            }
        });
    }
    /**
     * 出事化模块
     * @param cfg 模块类对象
     */
    static initModule(cfg) {
        return __awaiter(this, void 0, void 0, function* () {
            //增加 .js后缀
            let path = cfg.path;
            if (!path.endsWith('.js')) {
                path += '.js';
            }
            //加载模块类js文件
            let url = Util.mergePath([Application.getPath('module'), path]);
            yield ResourceManager.getResources([{ url: url, type: 'js' }]);
            let cls = eval(cfg.class);
            if (cls) {
                let instance = Reflect.construct(cls, [{
                        name: cfg.name,
                        data: cfg.data,
                        lazy: cfg.lazy
                    }]);
                //模块初始化
                yield instance.init();
                cfg.instance = instance;
                //单例，则需要保存到modules
                if (cfg.singleton) {
                    this.modules.set(instance.id, instance);
                }
                //初始化完成
                cfg.initing = false;
            }
            else {
                throw new NError('notexist1', Nodom.tipMessage.TipWords['moduleClass'], cfg.class);
            }
        });
    }
}
/**
 * 模块对象工厂 {moduleId:{key:容器key,className:模块类名,instance:模块实例}}
 */
ModuleFactory.modules = new Map();
/**
 * 模块类集合
 */
ModuleFactory.classes = new Map();
//# sourceMappingURL=modulefactory.js.map