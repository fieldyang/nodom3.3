import {Module} from "./module";
import {Element} from "./element";
import { Directive } from "./directive";
import { DirectiveType } from "./directivetype";
import { Util } from "./util";

/**
 * 指令管理器
 */
export  class DirectiveManager {
    /**
     * 指令类型集合
     */
    private static directiveTypes:Map<string,DirectiveType> = new Map();
    
    /**
     * 创建指令类型
     * @param name 		    指令类型名
     * @param config 	    配置对象{order:优先级,init:初始化函数,handler:渲染处理函数}
     */
    public static addType(name:string, prio?:number,init?:Function,handle?:Function) {
        this.directiveTypes.set(name, new DirectiveType(name,prio,init,handle));
    }

    /**
     * 移除过滤器类型
     * @param name  过滤器类型名
     */
    public static removeType(name:string) {
        this.directiveTypes.delete(name);
    }

    /**
     * 获取类型
     * @param name  指令类型名
     * @returns     指令或undefined
     */
    public static getType(name:string) {
        return this.directiveTypes.get(name);
    }

    /**
     * 是否有某个过滤器类型
     * @param type 		过滤器类型名
     * @returns 		true/false
     */
    public static hasType(name:string) {
        return this.directiveTypes.has(name);
    }

    /**
     * 指令初始化
     * @param directive     指令
     * @param dom           虚拟dom
     * @param module        模块
     * @param parent        父虚拟dom
     */
        
    public static init(directive:Directive,dom:Element,module?:Module,parent?:Element) {
        let dt = directive.type;
        if (dt) {
            return dt.init(directive,dom,module,parent);
        }
    }

    /**
     * 执行指令
     * @param directive     指令
     * @param dom           虚拟dom
     * @param module        模块
     * @param parent        父dom
     * @returns             指令执行结果
     */
    public static exec(directive:Directive, dom:Element, module:Module, parent:Element) {
        //调用
        return Util.apply(directive.type.handle, null, [directive,dom,module,parent]);
    }
}
