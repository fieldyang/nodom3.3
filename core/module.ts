import { Compiler } from "..";
import { Element } from "./element";
import { Model } from "./model";
import { ModelManager } from "./modelmanager";
import { ModuleFactory } from "./modulefactory";
import { Renderer } from "./renderer";
import { ChangedDom} from "./types";
import { Util } from "./util";

/**
 * 模块类
 */
export class Module {
    /**
     * 模块id(全局唯一)
     */
    public id: number;

    /**
     * 模块名(模块内(父模块的子模块之间)唯一)，如果不设置，则系统会自动生成Module+id
     */
    public name: string;

    /**
     * 模型，函数或对象
     */
    public model: any;

    /**
     * 方法集合，函数或对象
     */
    public methods: any;

    /**
     * 模版
     * 可以是模版串或模版函数
     * 用于动态产生模版串，模版函数说明：
     * 参数: props对象，在模版容器dom中进行配置
     * 返回值: 模版串或[模版串,true] 如果为true，表示后续不再产生新的模版串，不再重新编译
     */
    public template:any;

    /**
     * 子模块，类名数组，函数或数组
     */
    public modules: any;

    /**
     * css样式
     * 函数或数组，如果数组元素为object，则为样式名和键值对，否则为url,url为主页面相对路径
     * [{
     *  '.cls1:{
     *      color:'red',
     *      font-size:'12px'
     *  },
     *  '.cls2':{
     *      ...
     *  }
     * },'css1.css']
     */
    public css: any;

    /**
     * 是否是首次渲染
     */
    public firstRender: boolean = true;

    /**
     * 根虚拟dom
     */
    public virtualDom: Element;

    /**
     * 渲染树
     */
    private renderTree: Element;

    /**
     * 父模块 id
     */
    private parentId: number;

    /**
     * 子模块id数组
     */
    public children: Array<number> = [];

    /**
     * 状态 0 create(创建) 1初始化 2 unactive(渲染后被置为非激活) 3 active(激活，可渲染显示) 4 已渲染
     */
    public state: number;

    /**
     * 数据模型工厂
     */
    public modelManager: ModelManager;

    /**
     * 放置模块的容器
     */
    private container: HTMLElement;

    /**
     * 容器key
     */
    private containerKey:string;

    /**
     * 后置渲染序列
     */
    private preRenderOps:any[] = [];

    /**
     * 后置渲染序列
     */
    private postRenderOps:any[] = [];

    /**
     * 交换器  {交换器名(默认default):要替代的dom}
     */
    public swapMap:Map<string,Element>;
    
    /**
     * 构造器
     */
    constructor() {
        this.id = Util.genId();
        this.state = 0;
        //加入模块工厂
        ModuleFactory.add(this);
        // 初始化模型工厂
        this.modelManager = new ModelManager(this);
    }

    /**
     * 初始化
     */
    public init() {
        // 设置状态为初始化
        this.state = 1;
        //初始化model
        let data = (typeof this.model === 'function' ? this.model() : this.model);
        this.model = new Model(data || {}, this);
        
        //初始化方法集
        this.methods = (typeof this.methods === 'function' ? this.methods.apply(this.model) : this.methods) || {};
        
        //初始化子模块实例
        let mods = (typeof this.modules === 'function' ? this.modules.apply(this.model) : this.modules);
        if (Array.isArray(mods)) {
            for (let cls of mods) {
                Reflect.construct(cls,[]);
            }
        }
        delete this.modules;
        // 如果为字符串，则处理模版，否则在获取模块实例时处理
        if(typeof this.template === 'string'){
            this.virtualDom = Compiler.compile(this.template,this);
            delete this.template;
        }
        //处理css配置
        this.handleCss();
    }
    
    /**
     * 处理css
     */
    private handleCss() {
        let cssArr = (typeof this.css === 'function' ? this.css.apply(this.model) : this.css);
        if (Array.isArray(cssArr) && cssArr.length > 0) {
            //如果不存在stylesheet或最后一个stylesheet是link src，则新建一个style标签
            if (document.styleSheets.length === 0 || document.styleSheets[document.styleSheets.length - 1].href) {
                document.head.appendChild(document.createElement('style'));
            }
            //得到最后一个sheet
            let sheet: CSSStyleSheet = document.styleSheets[document.styleSheets.length - 1];
            for (let css of cssArr) {
                if (typeof css === 'string') {
                    sheet.insertRule("@import '" + css + "'");
                } else if (typeof css === 'object') {
                    for (let p in css) {
                        let style = p + '{';
                        for (let p1 in css[p]) {  //多个样式
                            style += p1 + ':' + css[p][p1] + ';'
                        }
                        style += p + '}';
                        //加入样式表
                        sheet.insertRule(style);
                    }
                }
            }
        }
        delete this.css;
    }

    /**
     * 模型渲染
     * @return false 渲染失败 true 渲染成功
     */
    public render(): boolean {
        //状态为2，不渲染
        if (this.state === 2) {
            return true;
        }
        //容器没就位或state不为active则不渲染，返回渲染失败
        if (this.state < 3 || !this.getContainer()) {
            return false;
        }
        //克隆新的树
        let root: Element = this.virtualDom.clone();
        //执行前置方法
        this.doRenderOps(0);
        if (this.firstRender) {
            this.doFirstRender(root);
        } else { //增量渲染
            //执行每次渲染前事件
            this.doModuleEvent('onBeforeRender');
            if (this.model) {
                root.model = this.model;
                let oldTree = this.renderTree;
                this.renderTree = root;
                //渲染
                root.render(this, null);
                this.doModuleEvent('onBeforeRenderToHtml');
                let deleteMap = new Map();
                let renderDoms:ChangedDom[] = [];
                // 比较节点
                root.compare(oldTree, renderDoms, deleteMap);
                //刪除和替換
                deleteMap.forEach((value, key) => {
                    let dp: HTMLElement = this.getNode(key);
                    let tmp = [];
                    for (let i = 0; i < value.length; i++) {
                        let index = value[i];
                        if (typeof index == 'object') {
                            let els;
                            //新建替换
                            if (index[2] != undefined) {
                                els = dp.querySelectorAll("[key='" + index[1] + "']");
                                dp.insertBefore((() => {
                                    const vDom: Element = root.query(index[0]);
                                    return Util.newEls(vDom, this, vDom.parent, this.getNode(vDom.parent.key));
                                })(), els[els.length - 1]);
                            } else if (index.length === 2) {
                                //更改dom节点顺序
                                let ele = this.getNode(index[0]);
                                if (ele) {
                                    els = dp.querySelectorAll("[key='" + index[1] + "']");
                                    dp.insertBefore(ele, els[els.length - 1]);
                                }
                            } else {
                                //删除dom节点
                                els = dp.querySelectorAll("[key='" + index[0] + "']");
                                dp.removeChild(els[els.length - 1]);
                            }
                        } else {
                            tmp.push(index);
                        }
                    }
                    //替换和删除需要反向操作
                    for (let i = tmp.length - 1; i >= 0; i--) {
                        let index = tmp[i];
                        if (typeof index == 'string') {
                            let parm = index.split('|');
                            index = parm[0];
                            const vDom: Element = root.query(parm[1]);
                            console.log(vDom);
                            dp.insertBefore((() => {
                                return Util.newEls(vDom, this, vDom.parent, this.getNode(vDom.parent.key));
                            })(), dp.childNodes[index++]);
                        }
                        if (dp.childNodes.length > index) dp.removeChild(dp.childNodes[index]);
                    }
                });
                deleteMap.clear();
                // 渲染
                renderDoms.forEach((item) => {
                    item.node.renderToHtml(this, item);
                });
            }
            //执行每次渲染后事件
            this.doModuleEvent('onRender');
        }

        //设置已渲染状态
        this.state = 4;
        //执行后置方法
        this.doRenderOps(1);

        return true;
    }

    /**
     * 执行首次渲染
     * @param root 	根虚拟dom
     */
    private doFirstRender(root: Element) {
        this.doModuleEvent('onBeforeFirstRender');
        //渲染树
        this.renderTree = root;
        if (this.model) {
            root.model = this.model;
        }
        root.render(this, null);
        this.doModuleEvent('onBeforeFirstRenderToHTML');
        
        //无容器，不执行
        if (!this.getContainer()) {
            return;
        }
        
        //清空子元素
        Util.empty(this.container);
        //渲染到html
        root.renderToHtml(this, <ChangedDom>{ type: 'fresh' });
        //删除首次渲染标志
        delete this.firstRender;
        //执行首次渲染后事件
        this.doModuleEvent('onFirstRender');
    }

    /**
     * 克隆模块
     */
    public clone(): Module {
        let me = this;
        let m: Module = Reflect.construct(this.constructor, []);
        //克隆数据
        if (this.model) {
            let data = Util.clone(this.model);
            m.model = new Model(data, m);
        }
        let excludes = ['id', 'name', 'model', 'virtualDom', 'container', 'containerKey', 'modelManager','swapMap'];
        Object.getOwnPropertyNames(this).forEach((item) => {
            if (excludes.includes(item)) {
                return;
            }
            m[item] = me[item];
        });
        //克隆虚拟dom树
        if(this.virtualDom){
            m.virtualDom = this.virtualDom.clone(true);
        }
        return m;
    }

    /**
     * 数据改变
     * @param model 	改变的model
     */
    public dataChange() {
        Renderer.add(this);
    }

    /**
     * 添加子模块
     * @param moduleId      模块id
     * @param className     类名
     */
    public addChild(moduleId: number) {
        if (!this.children.includes(moduleId)) {
            this.children.push(moduleId);
            let m: Module = ModuleFactory.get(moduleId);
            if (m) {
                m.parentId = this.id;
            }
        }
    }

    /**
     * 接受消息
     * @param fromName 		来源模块名
     * @param data 			消息内容
     */
    public receive(fromName, data) {
        this.doModuleEvent('onReceive', [fromName, data]);
    }

    /**
     * 激活模块(添加到渲染器)
     */
    public active() {
        this.state = 3;
        Renderer.add(this);
        for(let id of this.children){
            let m = ModuleFactory.get(id);
            if(m){
                m.active();
            }
        }
    }

    /**
     * 取消激活
     */
    public unactive() {
        if (ModuleFactory.getMain() === this || this.state === 2) {
            return;
        }
        //设置状态
        this.state = 2;
        //删除容器
        delete this.container;
        //设置首次渲染标志
        this.firstRender = true;
        //处理子节点
        for(let id of this.children){
            let m = ModuleFactory.get(id);
            if(m){
                m.unactive();
            }
        }
    }

    /**
     * 模块销毁
     */
    public destroy() {
        if (Util.isArray(this.children)) {
            this.children.forEach((item) => {
                let m: Module = ModuleFactory.get(item);
                if (m) {
                    m.destroy();
                }
            });
        }
        //从工厂释放
        ModuleFactory.remove(this.id);
    }

    /**
     * 获取父模块
     * @returns     父模块   
     */
    public getParent(): Module {
        if (!this.parentId) {
            return;
        }
        return ModuleFactory.get(this.parentId);
    }

    /*************事件**************/

    /**
     * 执行模块事件
     * @param eventName 	事件名
     * @param param 		参数，为数组
     */
    private doModuleEvent(eventName: string, param?: Array<any>) {
        if (param) {
            param.unshift(this);
        } else {
            param = [this];
        }
        this.invokeMethod(eventName, param);
    }

    /**
     * 获取模块方法
     * @param name  方法名
     * @returns     方法
     */
    public getMethod(name: string): Function {
        return this.methods[name];
    }

    /**
     * 添加方法
     * @param name  方法名
     * @param foo   方法函数
     */
    public addMethod(name: string, foo: Function) {
        this.methods[name] = foo;
    }

    /**
     * 移除方法
     * @param name  方法名
     */
    public removeMethod(name: string) {
        delete this.methods[name];
    }

    /**
     * 获取模块下的html节点
     * @param key       el key值或对象{attrName:attrValue}
     * @param notNull   如果不存在，则返回container
     * @returns         html element
     */
    public getNode(key: string | Object, notNull?: boolean): HTMLElement {
        let keyName: string;
        let value: any;
        if (typeof key === 'string') {  //默认为key值查找
            keyName = 'key';
            value = key;
        } else {  //对象
            keyName = Object.getOwnPropertyNames(key)[0];
            value = key[keyName];
        }
        let qs: string = "[" + keyName + "='" + value + "']";
        let ct = this.getContainer();

        if(ct){
            return ct.querySelector(qs);
        }else if(notNull){
            return ct || null;
        }
    }

    /**
     * 获取虚拟dom节点
     * @param key               dom key
     * @param fromVirtualDom    是否从源虚拟dom数获取，否则从渲染树获取
     */
    public getElement(key: string | Object, fromVirtualDom?: boolean) {
        let tree = fromVirtualDom ? this.virtualDom : this.renderTree;
        return tree.query(key);
    }

    /**
     * 获取模块容器
     */
    public getContainer(): HTMLElement {
        if(!this.container){
            if(this.containerKey){
                this.container = this.getParent().getNode(this.containerKey);
            }
        }
        return this.container;
    }

    /**
     * 设置渲染容器
     * @param el    容器
     */
    public setContainer(el:HTMLElement){
        this.container = el;
    }

    /**
     * 设置渲染容器key
     * @param key   容器key
     */
    public setContainerKey(key:string){
        this.containerKey = key;
    }

    /**
     * 设置首次渲染标志
     * @param flag  首次渲染标志true/false
     */
    public setFirstRender(flag: boolean) {
        this.firstRender = flag;
    }

    /**
     * 调用方法
     * @param methodName    方法名
     * @param args          参数数组
     */
    public invokeMethod(methodName: string, args: any[]) {
        let foo = this.getMethod(methodName);
        if (foo && typeof foo === 'function') {
            return foo.apply(this.model, args);
        }
    }

    /**
     * 添加渲染方法
     * @param foo   方法函数    
     * @param flag  标志 0:渲染前执行 1:渲染后执行
     * @param args  参数
     * @param once  是否只执行一次，如果为true，则执行后删除
     */
    public addRenderOps(foo:Function,flag:number,args?:any[],once?:boolean){
        if(typeof foo !== 'function'){
            return;
        }
        let arr = flag===0?this.preRenderOps:this.postRenderOps;
        arr.push({
            foo:foo,
            args:args,
            once:once
        });
    }

    /**
     * 执行渲染方法
     * @param flag 类型 0:前置 1:后置
     */
    private doRenderOps(flag:number){
        let arr = flag===0?this.preRenderOps:this.postRenderOps;
        if(arr){
            for(let i=0;i<arr.length;i++){
                let o = arr[i];
                o.foo.apply(this,o.args);
                // 执行后删除
                if(o.once){
                    arr.splice(i--,1);
                }
            }
        }
    }
}

