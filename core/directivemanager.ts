import { DirectiveType } from "./directivetype";
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
    public static addType(name:string,handle:Function,prio?:number) {
        this.directiveTypes.set(name, new DirectiveType(name,handle,prio));
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
}
