import { DirectiveManager } from "./directivemanager";
import { DirectiveType } from "./directivetype";
import { Element } from "./element";
import { Module } from "./module";
import { Util } from "./util";
import { Expression } from "./expression";

/**
 * 指令类
 */
export  class Directive {
    /**
     * 指令id
     */
    public id:number;

    /**
     * 指令类型，指令管理器中定义
     */
    public type:DirectiveType;
    
    /**
     * 指令值
     */
    public value:any;
    
    /**
     * 表达式
     */
    public expression:Expression;

    /**
     * 模块
     */
    public module:Module;

    /**
     * 指令所属dom
     */
    public dom:Element;
    
    /**
     * 构造方法
     * @param type  	类型名
     * @param value 	指令值
     * @param dom       指令对应的dom
     * @param module    模块  
     * @param notSort   不排序
     */
    constructor(type:string, value:string|Expression,dom:Element,module:Module, parent?:Element,notSort?:boolean) {
        this.id = Util.genId();
        this.dom = dom;
        this.module = module;
        this.type = DirectiveManager.getType(type);
        if (Util.isString(value)) {
            this.value = (<string>value).trim();
        }else if(value instanceof Expression){
            this.expression = value;
        }else{
            this.value = value;
        }
        
        if (type !== undefined && dom) {
            dom.addDirective(this,!notSort);
        }
        
        this.module= module;
    }

    /**
     * 执行指令
     */
    public exec() {
        this.type.handle.apply(null,[this]);
    }

    /**
     * 设置参数
     * @param name      参数名
     * @param value     参数值
     */
    public setParam(name:string,value:any){
        this.module.saveCache(`${this.dom.key}.directives.${this.type.name}.${name}`,value);
    }

    /**
     * 获取参数值
     * @param name      参数名
     * @returns         参数值
     */
    public getParam(name:string){
        return this.module.readCache(`${this.dom.key}.directives.${this.type.name}.${name}`);
    }

    /**
     * 移除参数
     * @param module    模块
     * @param dom       dom
     * @param name      参数名
     * @returns         参数值
     */
     public removeParam(module:Module,dom:Element,name:string){
        module.removeCache(`${dom.key}.directives.${this.type.name}.${name}`);
    }
}
