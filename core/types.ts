import { Module } from "./module";
import { Route } from "./route";

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
     * 路由对应模块对象或类或模块类名
     */
    module?:any;

    /**
     * 模块路径，当module为类名时需要，默认执行延迟加载
     */
    modulePath?:string;
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
 *  AST类
 */
export interface IASTObj {
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
    children?: Array<IASTObj>;

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
