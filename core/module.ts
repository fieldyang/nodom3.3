import { NCache } from "./cache";
import { Compiler } from "./compiler";
import { CssManager } from "./cssmanager";
import { VirtualDom } from "./virtualdom";
import { Model } from "./model";
import { ModuleFactory } from "./modulefactory";
import { ObjectManager } from "./objectmanager";
import { Renderer } from "./renderer";
import { Util } from "./util";
import { DiffTool } from "./difftool";
import { ModelManager } from "./modelmanager";

/**
 * 模块类
 * 模块方法说明：模版内使用的方法，包括事件，都直接在模块内定义
 *      方法this：指向module实例
 *      事件参数: model(当前按钮对应model),dom(事件对应虚拟dom),eventObj(事件对象),e(实际触发的html event)
 *      表达式方法：参数按照表达式方式给定即可
 */
export class Module {
    /**
     * 模块id(全局唯一)
     */
    public id: number;

    /**
     * 模型，代理过的data
     */
    public model:Model;

    /**
     * 子模块类集合，模版中引用的模块类需要声明
     * 如果类已经通过registModule注册过，这里不再需要定义，只需import即可
     */
    public modules: any;

    /**
     * 父模块通过dom节点传递的属性
     */
    public props:any;

    /**
     * 编译后的dom树
     */
    public originTree:VirtualDom;

    /**
     * 渲染树
     */
    public renderTree: VirtualDom;

    /**
     * 父模块 id
     */
    public parentId: number;

    /**
     * 子模块id数组
     */
    public children: Array<number> = [];

    /**
     * 状态 1初始化 2已渲染
     */
    public state: number;

    /**
     * 放置模块的容器
     */
    private container: HTMLElement;

    /**
     * 后置渲染序列
     */
    private preRenderOps:any[] = [];

    /**
     * 后置渲染序列
     */
    private postRenderOps:any[] = [];

    /**
     * 对象管理器，用于管理虚拟dom节点、指令、表达式、事件对象及其运行时参数
     */
    public objectManager:ObjectManager;

    /**
     * 更改model的map，用于记录增量渲染时更改的model
     */
    public changedModelMap:Map<string,boolean>;

    /**
     * 用于保存每个key对应的html node
     */
    public keyNodeMap:Map<string,Node> = new Map();

    /**
     * 不允许加入渲染队列标志，在renderdom前设置，避免render前修改数据引发二次渲染
     */
    public dontAddToRender:boolean;

    /**
     * 是否替换容器
     */
    public replaceContainer:boolean;

    /**
     * 构造器
     */
    constructor() {
        this.id = Util.genId();
        this.objectManager = new ObjectManager(this);
        this.changedModelMap = new Map();
        //加入模块工厂
        ModuleFactory.add(this);
    }

    /**
     * 初始化
     */
    public init() {
        // 设置状态为初始化
        this.state = 1;
        //初始化model
        this.model = new Model(this.data()||{} , this);
        //注册子模块
        if(this.modules && Array.isArray(this.modules)){
            for (let cls of this.modules) {
                ModuleFactory.addClass(cls);
            }
            delete this.modules;
        }
    }

    /**
     * 模版串方法，使用时重载
     * @param props     props对象，在模版容器dom中进行配置，从父模块传入
     * @returns         模版串
     */
    public template(props?:any):string{
        return null;
    }

    /**
     * 数据方法，使用时重载
     * @returns      model数据
     */
    public data():any{
        return {};
    }
    
    /**
     * 模型渲染
     */
    public render(): boolean {
        this.dontAddToRender = true;
        //编译
        if(!this.originTree){
            this.compile();
        }
        //不存在，不渲染
        if(!this.originTree){
            return;
        }
        //执行前置方法
        this.doRenderOps(0);
        this.doModuleEvent('onBeforeRender');
        if (!this.renderTree) {
            this.doFirstRender();
        } else { //增量渲染
            //执行每次渲染前事件
            if (this.model) {
                let oldTree = this.renderTree;
                this.renderTree = Renderer.renderDom(this,this.originTree,this.model);
                this.doModuleEvent('onBeforeRenderToHtml');
                let changeDoms = [];
                // 比较节点
                DiffTool.compare(this.renderTree,oldTree, changeDoms);
                //执行更改
                if(changeDoms.length>0){
                    Renderer.handleChangedDoms(this,changeDoms);
                }
            }
        }
        
        //设置已渲染状态
        this.state = 2;
        //执行后置方法
        this.doRenderOps(1);
        //执行每次渲染后事件
        this.doModuleEvent('onRender');
        this.changedModelMap.clear();
        this.dontAddToRender = false;
    }

    /**
     * 执行首次渲染
     * @param root 	根虚拟dom
     */
    private doFirstRender() {
        this.doModuleEvent('onBeforeFirstRender');
        //渲染树
        this.renderTree = Renderer.renderDom(this,this.originTree,this.model);
        this.doModuleEvent('onBeforeFirstRenderToHTML');
        //渲染为html element
        let el:any = Renderer.renderToHtml(this,this.renderTree,null,true);
        if(this.replaceContainer){ //替换
            ['style','class'].forEach(item=>{
                let c = this.container.getAttribute(item);
                if(!c){
                    return;
                }
                c = c.trim();
                let c1 = el.getAttribute(item) || '';
                if(item==='style'){
                    c += (c.endsWith(';')?'':';') + c1;
                }else{
                    c += ' ' + c1;
                }
                el.setAttribute(item,c);
            });
            Util.replaceNode(this.container,el);
        }else{
            //清空子元素
            Util.empty(this.container);
            this.container.appendChild(el);
        }
        //执行首次渲染后事件
        this.doModuleEvent('onFirstRender');
    }

    /**
     * 添加子模块
     * @param module    模块id或模块
     */
    public addChild(module: number|Module) {
        let mid;
        if(typeof module === 'number'){
            mid = module;
            module = ModuleFactory.get(mid);
        }else{
            mid = module.id;
        }
        if (!this.children.includes(mid)) {
            this.children.push(mid);
            module.parentId = this.id;
        }
    }

    /**
     * 激活模块(添加到渲染器)
     */
    public active() {
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
        if (ModuleFactory.getMain() === this) {
            return;
        }
        this.doModuleEvent('beforeUnActive');
        //设置状态
        this.state = 1;
        //删除容器
        delete this.container;
        //删除渲染树
        delete this.renderTree;

        // 清理dom key map
        this.keyNodeMap.clear();
        //清理缓存
        this.clearCache();
        this.doModuleEvent('unActive');
        //处理子模块
        for(let id of this.children){
            let m = ModuleFactory.get(id);
            if(m){
                m.unactive();
            }
        }
        //从html 卸载
        if(this.container){
            Util.empty(this.container);
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
        this.clearCache(true);
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

    /**
     * 执行模块事件
     * @param eventName 	事件名
     */
    private doModuleEvent(eventName: string) {
        this.invokeMethod(eventName, this.model);
    }

    /**
     * 获取模块方法
     * @param name  方法名
     * @returns     方法
     */
    public getMethod(name: string): Function {
        return this[name];
    }

    /**
     * 设置渲染容器
     * @param el        容器
     * @param replace   渲染时是否直接替换container
     */
    public setContainer(el:HTMLElement,replace?:boolean){
        this.container = el;
        this.replaceContainer = replace;
    }

    /**
     * 调用方法
     * @param methodName    方法名
     */
    public invokeMethod(methodName: string,arg1?:any,arg2?:any,arg3?:any) {
        let foo = this[methodName];
        if (foo && typeof foo === 'function') {
            let args = [];
            for(let i=1;i<arguments.length;i++){
                args.push(arguments[i]);
            }
            return foo.apply(this, args);
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

    /**
     * 设置props
     * @param props     属性值
     */
    public setProps(props:any){
        let change:boolean = false;
        //保留数据
        let dataObj = props.$data;
        //属性对比不对data进行对比，删除数据属性
        delete props.$data;
        if(!this.props){
            change = true;
        }else{
            const keys = Object.getOwnPropertyNames(props);
            let len1 = keys.length;
            const keys1 = this.props?Object.getOwnPropertyNames(this.props):[];
            let len2 = keys1.length;
            if(len1 !== len2){
                change = true;
            }else{
                for(let k of keys){
                    // object 默认改变
                    if(props[k] !== this.props[k] || typeof(props[k]) === 'object'){
                        change = true;
                        break;
                    }
                }
            }
        }

        //props数据复制到模块model
        if(dataObj){
            for(let d in dataObj){
                let o = dataObj[d];
                //如果为对象，需要绑定到模块
                if(typeof o === 'object'){
                    ModelManager.bindToModule(o,this);
                    this.model[d] = o;
                }else if(!this.props || this.model[d] === undefined){ //非对象，值不存在，或第一次，避免覆盖模块修改的数据
                    this.model[d] = o;
                }
            }
        }
        
        this.props = props;
        if(change){ //有改变，进行编译并激活
            this.compile();
            this.active();
        }
    }

    /**
     * 编译
     */
    public compile(){
        //清除缓存
        this.clearCache();
        const str = this.template(this.props);
        if(str){
            this.originTree = new Compiler(this).compile(str);
        }
    }
    /**
     * 清理缓存
     * @param force 强力清除 
     */
    public clearCache(force?:boolean){
        if(force){ //强力清除，后续不再使用
            this.objectManager.cache = new NCache();
            return;
        }
        
        //清理dom相关
        this.objectManager.clearSaveDoms();
        //清理指令
        this.objectManager.clearDirectives();
        //清理表达式
        this.objectManager.clearExpressions();
        //清理事件
        this.objectManager.clearEvents();
        //清理css url
        CssManager.clearModuleRules(this);
    }

    /**
     * 获取node
     * @param key   dom key 
     * @returns     html node
     */
    public getNode(key:string):Node{
        return this.keyNodeMap.get(key);
    }

    /**
     * save node
     * @param key   dom key
     * @param node  html node
     */
    public saveNode(key:string,node:Node){
        this.keyNodeMap.set(key,node);
    }
}
