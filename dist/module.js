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
import { Compiler } from "./compiler";
import { MessageQueue } from "./messagequeue";
import { MethodFactory } from "./methodfactory";
import { Model } from "./model";
import { ModelManager } from "./modelmanager";
import { ModuleFactory } from "./modulefactory";
import { Nodom } from "./nodom";
import { Renderer } from "./renderer";
import { ResourceManager } from "./resourcemanager";
import { Util } from "./util";
/**
 * 模块类
 */
export class Module {
    /**
     * 构造器
     * @param config    模块配置
     */
    constructor(config) {
        /**
         * 是否是首次渲染
         */
        this.firstRender = true;
        /**
         * 子模块id数组
         */
        this.children = [];
        /**
         * 模块创建时执行操作
         */
        this.createOps = [];
        /**
         * 状态 0 create(创建)、1 init(初始化，已编译)、2 unactive(渲染后被置为非激活) 3 active(激活，可渲染显示)
         */
        this.state = 0;
        /**
         * 需要加载新数据
         */
        this.loadNewData = false;
        /**
         * 待渲染的虚拟dom数组
         */
        this.renderDoms = [];
        /**
         * 放置模块的容器
         */
        this.container = null;
        /**
         * 子模块名id映射，如 {modulea:1}
         */
        this.moduleMap = new Map();
        /**
         * 插件集合
         */
        this.plugins = new Map();
        this.id = Util.genId();
        // 模块名字
        if (config && config.name) {
            this.name = config.name;
        }
        else {
            this.name = 'Module' + this.id;
        }
        ModuleFactory.add(this);
        this.methodFactory = new MethodFactory(this);
        this.modelManager = new ModelManager(this);
        //执行创建后操作
        for (let foo of this.createOps) {
            foo.call(this);
        }
        //执行创建事件
        this.doModuleEvent('onCreate');
        //无配置对象，不需要处理
        if (!config) {
            return;
        }
        //保存config，存在延迟初始化情况
        this.initConfig = config;
        //设置选择器
        this.selector = config.el;
        //方法加入工厂
        if (Util.isObject(config.methods)) {
            Util.getOwnProps(config.methods).forEach((item) => {
                this.methodFactory.add(item, config.methods[item]);
            });
        }
        //清除container的内部内容
        if (this.getContainer()) {
            this.template = this.container.innerHTML.trim();
            this.container.innerHTML = '';
        }
    }
    /**
     * 初始化模块（加载和编译）
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            let config = this.initConfig;
            let urlArr = []; //请求url数组
            let cssPath = Application.getPath('css');
            let templatePath = Application.getPath('template');
            let jsPath = Application.getPath('js');
            //加载文件
            if (config && Util.isArray(config.requires) && config.requires.length > 0) {
                config.requires.forEach((item) => {
                    let type;
                    let url = '';
                    if (Util.isObject(item)) { //为对象，可能是css或js
                        type = item['type'] || 'js';
                        url = item['url'];
                    }
                    else { //js文件
                        type = 'js';
                        url = item;
                    }
                    //转换路径
                    let path = type === 'js' ? jsPath : cssPath;
                    urlArr.push({ url: Util.mergePath([path, url]), type: type });
                });
            }
            //模版串
            let templateStr = this.template;
            //模版信息
            if (config.template) {
                config.template = config.template.trim();
                if (config.template.startsWith('<')) { //html模版串
                    templateStr = config.template;
                }
                else { //文件
                    urlArr.push({
                        url: Util.mergePath([templatePath, config.template]),
                        type: config.template.endsWith('.nd') ? 'nd' : 'template'
                    });
                }
            }
            //删除template
            delete this.template;
            //如果已存在templateStr，则直接编译
            if (!Util.isEmpty(templateStr)) {
                this.virtualDom = Compiler.compile(templateStr);
            }
            //数据
            if (config.data) { //数据
                if (Util.isObject(config.data)) { //数据
                    this.model = new Model(config.data, this);
                }
                else { //数据url
                    urlArr.push({
                        url: config.data,
                        type: 'data'
                    });
                    this.dataUrl = config.data;
                }
            }
            else { //空数据
                this.model = new Model({}, this);
            }
            //批量请求文件
            if (urlArr.length > 0) {
                let rets = yield ResourceManager.getResources(urlArr);
                for (let r of rets) {
                    if (r.type === 'template' || r.type === 'nd') {
                        this.virtualDom = r.content;
                    }
                    else if (r.type === 'data') {
                        this.model = new Model(r.content, this);
                    }
                }
            }
            //处理子模块
            if (this.initConfig.modules) {
                for (let cfg of this.initConfig.modules) {
                    let mdl = new Module(cfg);
                    mdl.parentId = this.id;
                    this.addChild(mdl.id);
                }
            }
            changeState(this);
            delete this.initConfig;
            /**
             * 修改状态
             * @param mod 	模块
             */
            function changeState(mod) {
                if (mod.isMain) {
                    mod.state = 3;
                    //可能不能存在数据，需要手动添加到渲染器
                    Renderer.add(mod);
                }
                else if (mod.parentId) {
                    mod.state = ModuleFactory.get(mod.parentId).state;
                }
                else {
                    mod.state = 1;
                }
            }
        });
    }
    /**
     * 模型渲染
     * @return false 渲染失败 true 渲染成功
     */
    render() {
        //状态为2，不渲染
        if (this.state === 2) {
            return true;
        }
        //容器没就位或state不为active则不渲染，返回渲染失败
        if (this.state !== 3 || !this.virtualDom || !this.getContainer()) {
            return false;
        }
        //克隆新的树
        let root = this.virtualDom.clone();
        if (this.firstRender) {
            //model无数据，如果存在dataUrl，则需要加载数据
            if (this.loadNewData && this.dataUrl) {
                Nodom.request({
                    url: this.dataUrl,
                    type: 'json'
                }).then((r) => {
                    this.model = new Model(r, this);
                    this.doFirstRender(root);
                    this.loadNewData = false;
                });
            }
            else {
                this.doFirstRender(root);
            }
        }
        else { //增量渲染
            //执行每次渲染前事件
            this.doModuleEvent('onBeforeRender');
            if (this.model) {
                root.model = this.model;
                let oldTree = this.renderTree;
                this.renderTree = root;
                //渲染
                root.render(this, null);
                this.clearDontRender(root);
                this.doModuleEvent('onBeforeRenderToHtml');
                // 比较节点
                root.compare(oldTree, this.renderDoms);
                // 删除
                for (let i = this.renderDoms.length - 1; i >= 0; i--) {
                    let item = this.renderDoms[i];
                    if (item.type === 'del') {
                        item.node.removeFromHtml(this);
                        this.renderDoms.splice(i, 1);
                    }
                }
                // 渲染
                this.renderDoms.forEach((item) => {
                    item.node.renderToHtml(this, item);
                });
            }
            //执行每次渲染后事件
            this.doModuleEvent('onRender');
        }
        //数组还原
        this.renderDoms = [];
        return true;
    }
    /**
     * 执行首次渲染
     * @param root 	根虚拟dom
     */
    doFirstRender(root) {
        this.doModuleEvent('onBeforeFirstRender');
        //渲染树
        this.renderTree = root;
        if (this.model) {
            root.model = this.model;
        }
        root.render(this, null);
        this.clearDontRender(root);
        this.doModuleEvent('onBeforeFirstRenderToHTML');
        //清空子元素
        Util.empty(this.container);
        //渲染到html
        root.renderToHtml(this, { type: 'fresh' });
        //删除首次渲染标志
        delete this.firstRender;
        //执行首次渲染后事件
        this.doModuleEvent('onFirstRender');
    }
    /**
     * 克隆模块
     * 共享virtual Dom，但是名字为新名字
     * @param moduleName    新模块名
     */
    clone(moduleName) {
        let me = this;
        let m = new Module({ name: moduleName });
        let excludes = ['id', 'name', 'model', 'virtualDom', 'container', 'containerKey', 'modelFactory', 'plugins'];
        Object.getOwnPropertyNames(this).forEach((item) => {
            if (excludes.includes(item)) {
                return;
            }
            m[item] = me[item];
        });
        //克隆虚拟dom树
        m.virtualDom = this.virtualDom.clone(true);
        return m;
    }
    /**
     * 检查容器是否存在，如果不存在，则尝试找到
     */
    getContainer() {
        //根模块，直接使用el
        if (this.selector) {
            this.container = document.querySelector(this.selector);
        }
        else { //非根模块，根据容器key获得
            this.container = document.querySelector("[key='" + this.containerKey + "']");
        }
        return this.container;
    }
    /**
     * 设置模块容器 key
     * @param key   模块容器key
     */
    setContainerKey(key) {
        this.containerKey = key;
    }
    /**
     * 获取模块容器 key
     * @param key   模块容器key
     */
    getContainerKey() {
        return (this.containerKey);
    }
    /**
     * 数据改变
     * @param model 	改变的model
     */
    dataChange() {
        Renderer.add(this);
    }
    /**
     * 添加子模块
     * @param moduleId      模块id
     * @param className     类名
     */
    addChild(moduleId) {
        if (!this.children.includes(moduleId)) {
            this.children.push(moduleId);
            let m = ModuleFactory.get(moduleId);
            if (m) {
                m.parentId = this.id;
            }
            //保存name和id映射
            this.moduleMap.set(m.name, moduleId);
            //执行无主消息检测
            MessageQueue.move(m.name, moduleId, this.id);
        }
    }
    /**
     * 发送
     * @param toName 		接收模块名或模块id，如果为模块id，则直接发送，不需要转换
     * @param data 			消息内容
     * @param type          0兄弟  1孩子 2父亲
     */
    send(toName, data, type) {
        if (typeof toName === 'number') {
            MessageQueue.add(this.id, toName, data);
            return;
        }
        //目标模块id
        let toId;
        //父模块id
        let parentId;
        let m;
        switch (type) {
            case 1: //发送孩子
                m = this.getChild(toName);
                if (m) {
                    toId = m.id;
                }
                parentId = this.id;
                break;
            case 2: //发送给父亲
                toId = this.parentId || 0;
            default: //发送给兄弟
                parentId = this.parentId || 0;
                //得到父模块
                m = ModuleFactory.get(parentId);
                if (m) {
                    m = m.getChild(toName);
                    if (m) {
                        toId = m.id;
                    }
                }
        }
        if (toId) {
            MessageQueue.add(this.id, toId, data);
        }
        else {
            MessageQueue.add(this.id, toName, data, parentId);
        }
    }
    /**
     * 广播给父、兄弟和孩子（第一级）节点
     */
    broadcast(data) {
        //兄弟节点
        if (this.parentId) {
            let pmod = ModuleFactory.get(this.parentId);
            if (pmod) {
                //父模块
                this.send(this.parentId, data);
                if (pmod.children) {
                    pmod.children.forEach((item) => {
                        //自己不发
                        if (item === this.id) {
                            return;
                        }
                        let m = ModuleFactory.get(item);
                        //兄弟模块
                        this.send(m.id, data);
                    });
                }
            }
        }
        if (this.children !== undefined) {
            this.children.forEach((item) => {
                let m = ModuleFactory.get(item);
                this.send(m.id, data);
            });
        }
    }
    /**
     * 接受消息
     * @param fromName 		来源模块名
     * @param data 			消息内容
     */
    receive(fromName, data) {
        this.doModuleEvent('onReceive', [fromName, data]);
    }
    /**
     * 激活模块(添加到渲染器)
     */
    active() {
        return __awaiter(this, void 0, void 0, function* () {
            //激活状态不用激活，创建状态不能激活
            if (this.state === 3) {
                return;
            }
            //未初始化，需要先初始化
            if (this.state === 0) {
                yield this.init();
            }
            this.state = 3;
            //添加到渲染器
            Renderer.add(this);
            //孩子节点激活
            if (Util.isArray(this.children)) {
                this.children.forEach((item) => __awaiter(this, void 0, void 0, function* () {
                    let m = ModuleFactory.get(item);
                    if (m) {
                        yield m.active();
                    }
                }));
            }
        });
    }
    /**
     * 取消激活
     */
    unactive() {
        //主模块不允许取消
        if (this.isMain || this.state === 2) {
            return;
        }
        this.state = 2;
        //设置首次渲染标志
        this.firstRender = true;
        if (Util.isArray(this.children)) {
            this.children.forEach((item) => {
                let m = ModuleFactory.get(item);
                if (m) {
                    m.unactive();
                }
            });
        }
    }
    /**
     * 模块终结
     */
    destroy() {
        if (Util.isArray(this.children)) {
            this.children.forEach((item) => {
                let m = ModuleFactory.get(item);
                if (m) {
                    m.destroy();
                }
            });
        }
        //从工厂释放
        ModuleFactory.remove(this.id);
    }
    /*************事件**************/
    /**
     * 执行模块事件
     * @param eventName 	事件名
     * @param param 		参数，为数组
     */
    doModuleEvent(eventName, param) {
        const foo = this.methodFactory.get(eventName);
        if (!foo) {
            return;
        }
        //调用方法
        Util.apply(foo, this.model, param);
    }
    /**
     * 添加实例化后操作
     * @param foo  	操作方法
     */
    addCreateOperation(foo) {
        if (!Util.isFunction(foo)) {
            return;
        }
        if (!this.createOps.includes(foo)) {
            this.createOps.push(foo);
        }
    }
    /**
     * 清理不渲染节点
     * @param dom   节点
     */
    clearDontRender(dom) {
        for (let i = 0; i < dom.children.length; i++) {
            let item = dom.children[i];
            if (item.dontRender) {
                dom.children.splice(i, 1);
                return;
            }
            //不渲染自己，子节点前进一级
            if (item.dontRenderSelf) {
                let arr = [];
                for (let d of item.children) {
                    d.parent = dom.parent;
                    d.parentKey = dom.parentKey;
                    arr.push(d);
                }
                dom.children.splice.apply(dom.children, [i, 1].concat(arr));
                continue;
            }
            this.clearDontRender(item);
        }
    }
    /**
     * 获取子孙模块
     * @param name          模块名
     * @param descendant    如果为false,只在子节点内查找，否则在后代节点查找（深度查询），直到找到第一个名字相同的模块
     */
    getChild(name, descendant) {
        if (this.moduleMap.has(name)) {
            let mid = this.moduleMap.get(name);
            return ModuleFactory.get(mid);
        }
        else if (descendant) {
            for (let id of this.children) {
                let m = ModuleFactory.get(id);
                if (m) {
                    let m1 = m.getChild(name, descendant);
                    if (m1) {
                        return m1;
                    }
                }
            }
        }
        return null;
    }
    /**
     * 获取模块方法
     * @param name  方法名
     * @returns     方法
     */
    getMethod(name) {
        return this.methodFactory.get(name);
    }
    /**
     * 添加方法
     * @param name  方法名
     * @param foo   方法函数
     */
    addMethod(name, foo) {
        this.methodFactory.add(name, foo);
    }
    /**
     * 移除方法
     * @param name  方法名
     */
    removeMethod(name) {
        this.methodFactory.remove(name);
    }
    /**
     * 添加插件
     * @param name      插件名
     * @param plugin    插件
     */
    addNPlugin(name, plugin) {
        if (name) {
            this.plugins.set(name, plugin);
        }
    }
    /**
     * 获取插件
     * @param name  插件名
     * @returns     插件实例
     */
    getNPlugin(name) {
        return this.plugins.get(name);
    }
    /**
     * 设置数据url
     * @param url   数据url
     */
    setDataUrl(url) {
        this.dataUrl = url;
        //设置新加载数据标志
        this.loadNewData = true;
    }
    /**
     * 获取模块下的html节点
     * @param key       el key值或对象{attrName:attrValue}
     * @param notNull   如果不存在，则返回container
     * @returns         html element
     */
    getNode(key, notNull) {
        let keyName;
        let value;
        if (typeof key === 'string') { //默认为key值查找
            keyName = 'key';
            value = key;
        }
        else { //对象
            keyName = Object.getOwnPropertyNames(key)[0];
            value = key[keyName];
        }
        let qs = "[" + keyName + "='" + value + "']";
        let el = this.container ? this.container.querySelector(qs) : null;
        if (!el && notNull) {
            return this.container;
        }
        return el;
    }
    /**
     * 获取虚拟dom节点
     * @param key               dom key
     * @param fromVirtualDom    是否从源虚拟dom数获取，否则从渲染树获取
     */
    getElement(key, fromVirtualDom) {
        let tree = fromVirtualDom ? this.virtualDom : this.renderTree;
        return tree.query(key);
    }
    /**
     * 判断是否为容器key
     * @param key   element key
     */
    isContainerKey(key) {
        return this.containerKey === key;
    }
    /**
     * 设置首次渲染标志
     * @param flag  首次渲染标志true/false
     */
    setFirstRender(flag) {
        this.firstRender = flag;
    }
    /**
     * 设置为主模块
     */
    setMain() {
        this.isMain = true;
    }
    /**
     * 设置模块容器选择器
     * @param selector
     */
    setSelector(selector) {
        this.selector = selector;
    }
}
//# sourceMappingURL=module.js.map