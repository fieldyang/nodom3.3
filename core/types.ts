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
/**
 * 路由配置
 */
export interface IRouteCfg {
    /**
     * 路由路径，可以带通配符*，可以带参数 /:
     */
    path?: string;
    
    /**
     * 模块类
     */
    module?:any;
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
     * 父路由
     */
    parent?: Route;
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
