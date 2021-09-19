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
     * 表达式id
     */
    public expression:number;

    
    /**
     * 构造方法
     * @param module    模块  
     * @param type  	类型名
     * @param value 	指令值
     * @param id        指令id
     * @param notSort   不排序
     */
    constructor(module:Module,type:string,value:string|Expression,id?:number) {
        this.id = id || Util.genId();
        this.type = DirectiveManager.getType(type);
        if (Util.isString(value)) {
            this.value = (<string>value).trim();
        }else if(value instanceof Expression){
            this.expression = value.id;
        }else{
            this.value = value;
        }
        //存入指令缓存
        module.objectManager.saveDirective(this);
    }

    /**
     * 执行指令
     * @param module    模块
     * @param dom       dom节点
     */
    public exec(module:Module,dom:Element) {
        this.type.handle.apply(this,[module,dom]);
    }

    /**
     * 设置参数
     * @param module    模块
     * @param name      参数名
     * @param value     参数值
     */
    public setParam(module:Module,name:string,value:any){
        module.objectManager.setDirectiveParam(this.id,name,value);
    }

    /**
     * 获取参数值
     * @param module    模块 
     * @param name      参数名
     * @returns         参数值
     */
    public getParam(module:Module,name:string){
        return module.objectManager.getDirectiveParam(this.id,name);
    }

    /**
     * 移除参数
     * @param module    模块
     * @param name      参数名
     * @returns         参数值
     */
    public removeParam(module:Module,name:string){
        module.objectManager.removeDirectiveParam(this.id,name);
    }
}
