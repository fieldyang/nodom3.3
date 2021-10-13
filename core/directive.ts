import { DirectiveManager } from "./directivemanager";
import { DirectiveType } from "./directivetype";
import { VirtualDom } from "./virtualdom";
import { Module } from "./module";
import { Util } from "./util";
import { Expression } from "./expression";
import { NError } from "./error";
import { NodomMessage } from "./nodom";

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
     * 表达式id
     */
    public expression:Expression;

    /**
     * 禁用
     */
    public disabled:boolean;
    /**
     * 构造方法
     * @param type  	类型名
     * @param value 	指令值
     */
    constructor(type?:string,value?:string|Expression) {
        this.id = Util.genId();
        if(type){
            this.type = DirectiveManager.getType(type);
            if(!this.type){
                throw new NError('notexist1',NodomMessage.TipWords['directive'],type);
            }
        }
        
        if (Util.isString(value)) {
            this.value = (<string>value).trim();
        }else if(value instanceof Expression){
            this.expression = value;
        }else{
            this.value = value;
        }
    }

    /**
     * 执行指令
     * @param module    模块
     * @param dom       渲染目标节点对象
     * @param src       源节点
     * @returns         true/false
     */
    public exec(module:Module,dom:any,src:VirtualDom):boolean {
        //禁用，不执行
        if(this.disabled){
            return true;
        }
        if(this.expression){
            this.value = this.expression.val(module,dom.model);
        }
        return this.type.handle.apply(this,[module,dom,src]);
    }

    /**
     * 设置参数
     * @param module    模块
     * @param dom       指令对应的虚拟dom
     * @param name      参数名
     * @param value     参数值
     */
    public setParam(module:Module,dom:VirtualDom,name:string,value:any){
        module.objectManager.setDirectiveParam(this.id,dom.key,name,value);
    }

    /**
     * 获取参数值
     * @param module    模块 
     * @param dom       指令对应的虚拟dom
     * @param name      参数名
     * @returns         参数值
     */
    public getParam(module:Module,dom:VirtualDom,name:string){
        return module.objectManager.getDirectiveParam(this.id,dom.key,name);
    }

    /**
     * 移除参数
     * @param module    模块
     * @param dom       指令对应的虚拟dom
     * @param name      参数名
     */
    public removeParam(module:Module,dom:VirtualDom,name:string){
        module.objectManager.removeDirectiveParam(this.id,dom.key,name);
    }

    /**
     * 克隆
     */
    public clone():Directive{
        let d = new Directive();
        d.type = this.type;
        d.expression = this.expression;
        d.value = this.value;
        return d;
    }
}
