import { Element } from "./element";
import { Module } from "./module";
import { Route } from "./route";

/**
 * module class obj
 */
export interface IMdlClassObj {
    /**
     * class名或class
     */
    class?: any;

    /**
     * 模块名
     */
    name?: string;

    /**
     * class文件路径
     */
    path?: string;

    /**
     * 模型
     */
    model?: any;
    /**
     * 实例
     */
    instance?: Module;
    /**
     * 数据
     */
    data?: string | Object;
    /**
     * 是否单例
     */
    singleton?: boolean;
    /**
     * 懒加载
     */
    lazy?: boolean;

    /**
     * 是否正在初始化
     */
    initing?: boolean;

    /**
     * 等待模块初始化的id列表
     */
    waitList?: number[];
    className?: string;
}

export interface ExpressionMd {
    obj: any,
    key: any,
    moduleName: any,
}
export interface RegisterOps {
    /**
     * 模块名
     */
    name: string,
    /**
     * 模块类名
     */
    class: string
}

/**
 * 应用初始化配置类型
 */
export interface IAppCfg {
    /**
     * 路径参数，请参阅NApplication path属性
     */
    path?: any;

    /**
     * 语言，默认 zh
     */
    language: string;

    /**
     * 调度器间隔时间(ms)，如果支持requestAnimationFrame，则不需要
     */
    scheduleCircle?: number;

    /**
     * 主模块配置
     */
    module: IModuleCfg;

    /**
     * 模块配置数组，数组元素包括
     *      class:模块类名,
     *      path:模块路径(相对于app module路径),
     *      data:数据路径(字符串)或数据(object),
     *      singleton:单例(全应用公用同一个实例，默认true),
     *      lazy:懒加载(默认false)
     */
    modules: IMdlClassObj[];

    /**
     * 路由配置
     * class:模块类名,
     * moduleName:模块名
     * data:数据url
     * routes:子路由
     * onEnter:路由进入事件
     * onLeave:路由离开事件
     */
    routes: IRouteCfg[];

    /**
     * 状态管理对象，实例化后引入
     */
    store: Object;
}


/**
 * 路由配置
 */
export interface IRouteCfg {
    /**
     * 路由路径，可以带通配符*，可以带参数 /:
     */
    path?: string;
    
    /**
     * 模块
     */
    module?:Module;
    /**
     * 子路由数组
     */
    routes?: Array<IRouteCfg>;

    /**
     * 进入路由事件方法
     */
    onEnter?: Function;
    /**
     * 离开路由方法
     */
    onLeave?: Function;
    /**
     * 是否使用父路由路径
     */
    useParentPath?: boolean;
    
    /**
     * 父路由
     */
    parent?: Route;
}

/**
 * 模块配置对象
 */
export interface IModuleCfg {
    /**
     * 模块名(模块内(父模块的子模块之间)唯一)，如果不设置，则系统会自动生成Module+id
     */
    name?: string;

    /**
     * 容器选择器
     */
    el?: string;
    /**
     * 是否单例，如果为true，则整个应用中共享一个模块实例，默认false
     */
    singleton?: boolean;

    /**
     * 模块类名
     */
    class?: string;

    /**
     * 模块路径(相对于app module路径)
     */
    path?: string;

    /**
     * 模版字符串，如果以“<”开头，则表示模版字符串，否则表示模版url
     */
    template?: string;
    /**
     * 数据，如果为json object，直接作为模型数据，如果为字符串，则表示数据url，需要请求得到数据
     */
    data?: Object | string;
    /**
     * 模块方法集合
     * 不要用箭头"=>" 操作符定义
     * ```
     * 	{
     * 		method1:function1(){},
     * 		method2:function2(){},
     * 		...
     * 	}
     * ```
     */
    methods?: Object;

    /**
     * 子模块配置
     */
    modules?: IModuleCfg[];

    /**
     * 先于模块初始化加载的文件集合
     * 如果为string，则表示资源路径，type为js
     * 如果为object，则格式为{type:'js'/'css',url:路径}
     */
    requires?: Array<string | Object>;

    /**
     * 实例化后的状态管理对象，配置后，所有模块可见
     */
    store?: object
}

/**
 * 资源对象
 */
export interface IResourceObj {
    /**
     * 资源内容 字符串或数据对象或element
     */
    content?: any;

    /**
     * 类型js、template(html,htm), nd(编译后的模版文件)，data(不保存资源)
     */
    type?: string;

    /**
     * 需要加载
     */
    needLoad?: boolean;
}

/**
 * 提示消息接口
 */
export interface ITipMessage {
    TipWords: Object;
    ErrorMsgs: Object;
    FormMsgs: Object;
    WeekDays: Object;
}

/**
 * 改变的dom类型
 * 用于比较需要修改渲染的节点属性存储
 */
export class ChangedDom {
    /**
     * 改变方式
     */
    public type: string;
    /**
     * 改变的节点
     */
    public node: Element;
    /**
     * 父虚拟dom
     */
    public parent: Element;
    /**
     * 在父节点中的位置
     */
    public index: number;

    /**
     * 改变的属性数组
     * [{prop1:value1},...]
     */
    public changeProps: Array<Object>;

    /**
     * 改变的asset
     */
    public changeAssets: Array<Object>;

    /**
     * 移除的属性名数组
     */
    public removeProps: Array<string>;

    /**
     * 
     * @param node      虚拟节点
     * @param type      修改类型  add(添加节点),del(删除节点),upd(更新节点),rep(替换节点),text(修改文本内容)
     * @param parent    父虚拟dom
     * @param index     在父节点中的位置索引
     */
    constructor(node?: Element, type?: string, parent?: Element, index?: number) {
        this.node = node;
        this.type = type;
        this.parent = parent;
        this.index = index;
    }
}

/**
 * 自定义标签配置
 */
export interface IDefineElementCfg {
    /**
     * 初始化方法
     */
    init: Function,

    /**
     * 渲染时方法
     */
    handler?: Function
}

/**
 *  AST对象约束
 */
export interface ASTObj extends Object {
    /**
     * 节点类型，如果是原生节点，如div则是div，如果是文本节点则是text。如果是注释则为comment
     */
    tagName: string;

    /**
     * 属性map，里面为属性对象如{name:**,...}
     */
    attrs?: Map<string, any>;
    /**
     * 事件数组，里面为事件对象{eventName:'click',eventHandler:'change'}
     */
    events?: Array<{ eventName: string, exec: any }>;

    /**
     * 子节点数组，与textContent互斥
     */
    children?: Array<ASTObj>;

    /**
     * 表达式数组
     */
    expressions?: any[]

    /**
     * textContent 节点为text的时候才有的属性，与children属性互斥
     */
    textContent?: string;

    /**
     * 是否闭合
     */
    isClosed?: boolean;
}

/**
 * 自关闭标签
 */
// export const selfClosingTag = [
//     "area",
//     "base",
//     "basefont",
//     "br",
//     "col",
//     "embed",
//     "frame",
//     "hr",
//     "img",
//     "input",
//     "keygen",
//     "link",
//     "meta",
//     "param",
//     "source",
//     "track",
// ];
