import { Element } from "./element";
import { Model } from "./model";
import { ModelManager } from "./modelmanager";
import { Plugin } from "./plugin";
import { IModuleCfg } from "./types";
/**
 * 模块类
 */
export declare class Module {
    /**
     * 模块id(全局唯一)
     */
    id: number;
    /**
     * 模块名(模块内(父模块的子模块之间)唯一)，如果不设置，则系统会自动生成Module+id
     */
    private name;
    /**
     * 模型
     */
    model: Model;
    /**
     * 是否主模块，一个app只有一个根模块
     */
    private isMain;
    /**
     * 是否是首次渲染
     */
    private firstRender;
    /**
     * 根虚拟dom
     */
    virtualDom: Element;
    /**
     * 渲染树
     */
    private renderTree;
    /**
     * 父模块名
     */
    private parentId;
    /**
     * 子模块id数组
     */
    children: Array<number>;
    /**
     * 模块对应容器选择器
     */
    private selector;
    /**
     * 模块创建时执行操作
     */
    private createOps;
    /**
     * 状态 0 create(创建)、1 init(初始化，已编译)、2 unactive(渲染后被置为非激活) 3 active(激活，可渲染显示)
     */
    state: number;
    /**
     * 数据url
     */
    private dataUrl;
    /**
     * 需要加载新数据
     */
    private loadNewData;
    /**
     * 方法工厂
     */
    private methodFactory;
    /**
     * 数据模型工厂
     */
    modelManager: ModelManager;
    /**
     * 待渲染的虚拟dom数组
     */
    private renderDoms;
    /**
     * 初始配置
     */
    private initConfig;
    /**
     * 放置模块的容器
     */
    private container;
    /**
     * 模版串
     */
    private template;
    /**
     * 容器key
     */
    private containerKey;
    /**
     * 子模块名id映射，如 {modulea:1}
     */
    private moduleMap;
    /**
     * 插件集合
     */
    private plugins;
    /**
     * 构造器
     * @param config    模块配置
     */
    constructor(config?: IModuleCfg);
    /**
     * 初始化模块（加载和编译）
     */
    private init;
    /**
     * 模型渲染
     * @return false 渲染失败 true 渲染成功
     */
    render(): boolean;
    /**
     * 执行首次渲染
     * @param root 	根虚拟dom
     */
    private doFirstRender;
    /**
     * 克隆模块
     * 共享virtual Dom，但是名字为新名字
     * @param moduleName    新模块名
     */
    clone(moduleName: string): any;
    /**
     * 检查容器是否存在，如果不存在，则尝试找到
     */
    getContainer(): HTMLElement;
    /**
     * 设置模块容器 key
     * @param key   模块容器key
     */
    setContainerKey(key: string): void;
    /**
     * 获取模块容器 key
     * @param key   模块容器key
     */
    getContainerKey(): string;
    /**
     * 数据改变
     * @param model 	改变的model
     */
    dataChange(): void;
    /**
     * 添加子模块
     * @param moduleId      模块id
     * @param className     类名
     */
    addChild(moduleId: number): void;
    /**
     * 发送
     * @param toName 		接收模块名或模块id，如果为模块id，则直接发送，不需要转换
     * @param data 			消息内容
     * @param type          0兄弟  1孩子 2父亲
     */
    send(toName: string | number, data: any, type?: number): void;
    /**
     * 广播给父、兄弟和孩子（第一级）节点
     */
    broadcast(data: any): void;
    /**
     * 接受消息
     * @param fromName 		来源模块名
     * @param data 			消息内容
     */
    receive(fromName: any, data: any): void;
    /**
     * 激活模块(添加到渲染器)
     */
    active(): Promise<void>;
    /**
     * 取消激活
     */
    unactive(): void;
    /**
     * 模块终结
     */
    destroy(): void;
    /*************事件**************/
    /**
     * 执行模块事件
     * @param eventName 	事件名
     * @param param 		参数，为数组
     */
    private doModuleEvent;
    /**
     * 添加实例化后操作
     * @param foo  	操作方法
     */
    addCreateOperation(foo: Function): void;
    /**
     * 清理不渲染节点
     * @param dom   节点
     */
    clearDontRender(dom: Element): void;
    /**
     * 获取子孙模块
     * @param name          模块名
     * @param descendant    如果为false,只在子节点内查找，否则在后代节点查找（深度查询），直到找到第一个名字相同的模块
     */
    getChild(name: string, descendant?: boolean): Module;
    /**
     * 获取模块方法
     * @param name  方法名
     * @returns     方法
     */
    getMethod(name: string): Function;
    /**
     * 添加方法
     * @param name  方法名
     * @param foo   方法函数
     */
    addMethod(name: string, foo: Function): void;
    /**
     * 移除方法
     * @param name  方法名
     */
    removeMethod(name: string): void;
    /**
     * 添加插件
     * @param name      插件名
     * @param plugin    插件
     */
    addNPlugin(name: string, plugin: Plugin): void;
    /**
     * 获取插件
     * @param name  插件名
     * @returns     插件实例
     */
    getNPlugin(name: string): Plugin;
    /**
     * 设置数据url
     * @param url   数据url
     */
    setDataUrl(url: string): void;
    /**
     * 获取模块下的html节点
     * @param key       el key值或对象{attrName:attrValue}
     * @param notNull   如果不存在，则返回container
     * @returns         html element
     */
    getNode(key: string | Object, notNull?: boolean): HTMLElement;
    /**
     * 获取虚拟dom节点
     * @param key               dom key
     * @param fromVirtualDom    是否从源虚拟dom数获取，否则从渲染树获取
     */
    getElement(key: string, fromVirtualDom?: boolean): any;
    /**
     * 判断是否为容器key
     * @param key   element key
     */
    isContainerKey(key: string): boolean;
    /**
     * 设置首次渲染标志
     * @param flag  首次渲染标志true/false
     */
    setFirstRender(flag: boolean): void;
    /**
     * 设置为主模块
     */
    setMain(): void;
    /**
     * 设置模块容器选择器
     * @param selector
     */
    setSelector(selector: string): void;
}
