import { NCache } from "./cache";
import { Compiler } from "./compiler";
import { CssManager } from "./cssmanager";
import { Element } from "./element";
import { Model } from "./model";
import { ModelManager } from "./modelmanager";
import { ModuleFactory } from "./modulefactory";
import { ObjectManager } from "./objectmanager";
import { Renderer } from "./renderer";
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
     * 数据，模块中定义
     */
    public data: any;

    /**
     * 模型，代理过的data
     */
    public model:Model;

    /**
     * 方法集合，函数或对象
     * 模版内使用的方法，包括事件，都在这里面定义
     * 方法this： 指向module实例
     * 事件参数: model(当前按钮对应model),dom(事件对应虚拟dom),eventObj(事件对象),e(实际触发的html event)
     * 表达式方法：参数按照表达式方式给定即可
     */
    public methods: any;

    /**
     * 子模块类集合，模版中引用的模块类需要声明
     * 如果类已经通过registModule注册过，这里不再需要定义，只需import即可
     */
    public modules: any;

    /**
     * 父模块通过dom节点传递的属性
     */
    private props:any;

    /**
     * 编译后的dom树
     */
     public originTree:Element;

    /**
     * 渲染树
     */
    public renderTree: Element;

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
     * 对象管理器，用于管理虚拟dom节点、指令、表达式、事件对象及其运行时参数
     */
    public objectManager:ObjectManager;

    /**
     * 构造器
     */
    constructor() {
        this.id = Util.genId();
        this.objectManager = new ObjectManager(this);
        this.methods = {};
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
        //创建模型，克隆数据
        this.model = new Model(Util.clone(this.data||{}) , this);
        
        //注册子模块
        if(this.modules && Array.isArray(this.modules)){
            for (let cls of this.modules) {
                ModuleFactory.addClass(cls);
            }
            delete this.modules;
        }
    }

    /**
     * 模版串方法
     * @param props     props对象，在模版容器dom中进行配置，从父模块传入
     * @returns         模版串
     */
    public template(props?:any):string{
        return null;
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
        //编译
        if(!this.originTree){
            this.compile();
        }
        let root:Element = this.originTree.clone();
        
        //执行前置方法
        this.doRenderOps(0);
        if (!this.renderTree) {
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
                let changeDoms = [];
                // 比较节点
                root.compare(oldTree, changeDoms);
                //刪除和替換
                for(let item of changeDoms){
                    let[n1,n2,pEl] = [
                        item[1]?this.objectManager.getNode(item[1].key):null,
                        item[2]&&typeof item[2]==='object'?this.objectManager.getNode(item[2].key):null,
                        item[3]?this.objectManager.getNode(item[3].key):null
                    ];
                    switch(item[0]){
                        case 1: //添加
                            //把新dom缓存添加到旧dom缓存
                            item[1].renderToHtml(this,pEl,true);
                            n1 = this.objectManager.getNode(item[1].key);
                            if(!n2){ //不存在添加节点或为索引号
                                if(typeof item[2] === 'number' && pEl.childNodes.length-1>item[2]){
                                    pEl.insertBefore(n1,pEl.childNodes[item[2]]);
                                }else{
                                    pEl.appendChild(n1);
                                }
                            }else{
                                pEl.insertBefore(n1,n2);
                            }
                            break;
                        case 2: //修改
                            item[1].renderToHtml(this);
                            break;
                        case 3: //删除
                            //清除缓存
                            this.objectManager.removeSavedNode(item[1].key);
                            //从html dom树移除
                            pEl.removeChild(n1);
                            break;
                        case 4: //移动
                            if(item[4] ){  //相对节点后
                                if(n2&&n2.nextSibling){
                                    pEl.insertBefore(n1,n2.nextSibling);
                                }else{
                                    pEl.appendChild(n1);
                                }
                            }else{
                                pEl.insertBefore(n1,n2);
                            }
                            break;
                        default: //替换
                            //替换之前的dom缓存
                            item[1].renderToHtml(this,pEl,true);
                            n1 = this.objectManager.getNode(item[1].key);
                            pEl.replaceChild(n1,n2);
                    }
                }
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
        //清空子元素
        Util.empty(this.container);
        //渲染到html
        root.renderToHtml(this, this.container,true);
        this.container.appendChild(this.objectManager.getNode(root.key));
        //执行首次渲染后事件
        this.doModuleEvent('onFirstRender');
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
        //删除渲染树
        delete this.renderTree;

        //清理缓存
        this.clearCache();

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
     * 获取虚拟dom节点
     * @param key               dom key
     * @param fromVirtualDom    是否从源虚拟dom数获取，否则从渲染树获取
     */
    public getElement(key: string | Object) :Element{
        return this.renderTree.query(<string>key);
    }

    /**
     * 获取模块容器
     */
    public getContainer(): HTMLElement {
        if(!this.container){
            if(this.containerKey){
                this.container = <HTMLElement>this.getParent().objectManager.getNode(this.containerKey);
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
     * 调用方法
     * @param methodName    方法名
     */
    public invokeMethod(methodName: string,arg1?:any,arg2?:any,arg3?:any) {
        let foo = this.getMethod(methodName);
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
        //为提升性能，只进行浅度比较
        //如果相同且属性值不含对象，则返回
        let change:boolean = !Util.compare(this.props,props);
        if(!change){
            if(props){
                for(let p of Object.keys(props)){
                    if(typeof p === 'object' && !Util.isFunction(p)){
                        change = true;
                        break;
                    }
                }
            }
        }
        if(change){
            this.props = props;
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
        this.originTree = new Compiler(this).compile(this.template(this.props));
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
        
        //清理指令
        this.objectManager.clearDirectives();
        //清理表达式
        this.objectManager.clearExpressions();
        //清理事件
        this.objectManager.clearEvents();
        //清理css url
        CssManager.clearModuleRules(this);
    }
}
