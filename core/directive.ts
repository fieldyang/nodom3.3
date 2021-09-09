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
     * 附加参数
     */
    public params:any;

    /**
     * 附加操作
     */
    public extra:any;

    /**
     * 构造方法
     * @param type  	类型名
     * @param value 	指令值
     * @param dom       指令对应的dom
     * @param filters   过滤器字符串或过滤器对象,如果为过滤器串，则以｜分割
     * @param notSort   不排序
     */
    constructor(type:string, value:string|Expression,dom?:Element, parent?:Element,notSort?:boolean) {
        this.id = Util.genId();
        this.type = DirectiveManager.getType(type);
        if (Util.isString(value)) {
            this.value = (<string>value).trim();
        }else if(value instanceof Expression){
            this.expression = value;
        }
        
        if (type !== undefined && dom) {
            DirectiveManager.init(this,dom,parent);
            dom.addDirective(this,!notSort);
        }
    }

    /**
     * 执行指令
     * @param module    模块 
     * @param dom       指令执行时dom
     * @param parent    父虚拟dom
     */
    public async exec(module:Module,dom:Element,parent?:Element) {
        return DirectiveManager.exec(this,dom,module,parent);
    }

    /**
     * 克隆
     * @param dst   目标dom
     * @returns     新指令
     */
    public clone(dst:Element):Directive{
        let dir = new Directive(this.type.name,this.value);
        if(this.params){
            dir.params = Util.clone(this.params);
        }
        if(this.extra){
            dir.extra = Util.clone(this.extra);
        }
        if(this.expression){
            dir.expression = this.expression;
        }

        DirectiveManager.init(dir,dst);
        return dir;
    }
}
