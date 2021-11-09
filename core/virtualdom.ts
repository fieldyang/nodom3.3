import { Directive } from "./directive";
import { DirectiveManager } from "./directivemanager";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { Model } from "./model";
import { Module } from "./module";
import { Util } from "./util";

/**
 * 虚拟dom
 */
export class VirtualDom {
    /**
     * 元素名，如div
     */
    public tagName: string;

    /**
     * key，整颗虚拟dom树唯一
     */
    public key: string;

    /**
     * 绑定模型
     */
    public model: Model;

    /**
     * element为textnode时有效
     */
    public textContent: string;

    /**
     * 表达式+字符串数组，用于textnode
     */
    public expressions: Array<Expression | string>;

    /**
     * 指令集
     */
    public directives: Directive[];

    /**
     * 直接属性 不是来自于attribute，而是直接作用于html element，如el.checked,el.value等
     */
    public assets: Map<string, any>;

    /**
     * 静态属性(attribute)集合
     * {prop1:value1,...}
     */
    public props: Map<string,any>;

    /**
     * 事件集合,{eventName1:nodomNEvent1,...}
     * 一个事件名，可以绑定多个事件方法对象
     */
    public events: Map<string, number[]>;

    /**
     * 子节点数组[]
     */
    public children: Array<VirtualDom>;

    /**
     * 父虚拟dom
     */
    // public parent: VirtualDom;

    /**
     * staticNum 静态标识数
     *  0 表示静态，不进行比较
     *  > 0 每次比较后-1
     *  < 0 不处理
     */
    public staticNum:number = 0;

    /**
     * 对应的所有表达式的字段都属于dom model内
     */
    public allModelField:boolean=true;

    /**
     * 未改变标志，本次不渲染
     */
    public notChange:boolean;

    /**
     * 子模块id，模块容器时有效
     */
    public subModuleId:number;

    /**
     * 不添加到树
     */
    public dontAddToTree:boolean;

    /**
     * 父dom
     */
    public parent:VirtualDom;

    /**
     * @param tag       标签名
     * @param key       key
     */
    constructor(tag?: string,key?:string) {
        this.key = key || (Util.genId()+'');
        if(tag){
            this.tagName = tag;
        }
    }

    /**
     * 移除多个指令
     * @param directives 	待删除的指令类型数组或指令类型
     */
    public removeDirectives(directives: string[]) {
        if(!this.directives){
            return;
        }
        //数组
        directives.forEach(d=>{
            this.removeDirective(d);
        });
    }

    /**
     * 移除指令
     * @param directive 	待删除的指令类型名
     */
    public removeDirective(directive: string) {
        if(!this.directives){
            return;
        }
        
        let ind;
        if ((ind = this.directives.findIndex(item => item.type.name === directive)) !== -1) {
            this.directives.splice(ind, 1);
        }
        if(this.directives.length === 0){
            delete this.directives;
        }
    }

    /**
     * 添加指令
     * @param directive     指令对象
     * @param sort          是否排序
     */
    public addDirective(directive: Directive, sort?: boolean) {
        if(!this.directives){
            this.directives = [];
        }else if(this.directives.find(item=>item.type.name === directive.type.name)){
            return;
        }
        this.directives.push(directive);
        //指令按优先级排序
        if (sort) {
            this.sortDirective();
        }
    }

    /**
     * 指令排序
     */
    public sortDirective(){
        if(!this.directives){
            return;
        }
        if (this.directives.length > 1) {
            this.directives.sort((a, b) => {
                return DirectiveManager.getType(a.type.name).prio < DirectiveManager.getType(b.type.name).prio?-1:1;
            });
        }
    }

    /**
     * 是否有某个类型的指令
     * @param typeName 	    指令类型名
     * @returns             true/false
     */
    public hasDirective(typeName:string): boolean {
        return this.directives && this.directives.findIndex(item => item.type.name === typeName) !== -1;
    }

    /**
     * 获取某个类型的指令
     * @param module            模块
     * @param directiveType 	指令类型名
     * @returns                 指令对象
     */
    public getDirective(directiveType:string): Directive {
        if(!this.directives){
            return;
        }
        return this.directives.find(item => item.type.name === directiveType);
    }

    /**
     * 添加子节点
     */
    public add(dom:VirtualDom){
        if(!this.children){
            this.children = [];
        }
        this.children.push(dom);
    }
    /**
     * 是否存在某个class
     * @param cls   classname
     * @return      true/false
     */
    public hasClass(cls: string): boolean {
        let clazz = this.getProp('class');
        if (!clazz) {
            return false;
        } else {
            return clazz.trim().split(/\s+/).includes(cls);
        }
    }

    /**
     * 添加css class
     * @param cls class名
     */
    public addClass(cls: string) {
        let clazz = this.getProp('class');
        if (!clazz || clazz === '') {
            this.setProp('class', cls);
            this.setStaticOnce();
        } else {
            let sa: any[] = clazz.trim().split(/\s+/);
            if (!sa.includes(cls)) {
                sa.push(cls);
                clazz = sa.join(' ');
                this.setProp('class',clazz);
                this.setStaticOnce();
            }
        }
    }

    /**
     * 删除css class
     * @param cls class名
     */
    public removeClass(cls: string) {
        let clazz = this.getProp('class');
        if (!clazz || clazz === '') {
            return;
        } else {
            let sa: string[] = clazz.trim().split(/\s+/);
            let index;
            if ((index = sa.indexOf(cls)) !== -1) {
                sa.splice(index, 1);
                clazz = sa.join(' ');
            }
        }
        this.setProp('class',clazz);
    }
    /**
     * 查询style
     * @param styStr style字符串
     */
    public hasStyle(styStr: string) {
        let styleStr = this.getProp('style');
        if (!styleStr) {
            return false;
        } else {
            return styleStr.trim().split(/;\s+/).includes(styStr);
        }
    }

    /**
     * 添加style
     *  @param styStr style字符串
     */
    public addStyle(styStr: string) {
        let styleStr = this.getProp('style');
        if (!styleStr) {
            this.setProp('style', styStr);
            this.setStaticOnce();
        } else {
            let sa: any[] = styleStr.trim().split(/;\s+/);
            if (!sa.includes(styStr)) {
                sa.push(styStr);
                styleStr = sa.join(';');
                this.setProp('style',styleStr);
                this.setStaticOnce();
            }
        }
    }

    /**
     * 删除style
     * @param styStr style字符串
     */
    public removeStyle(styStr: string) {
        let styleStr = this.getProp('style');
        if (!styleStr) {
            return;
        } else {
            let sa: string[] = styleStr.trim().split(/;\s+/);
            let index;
            if ((index = sa.indexOf(styStr)) !== -1) {
                sa.splice(index, 1);
                styleStr = sa.join(';');
            }
        }
        this.setProp('style',styleStr);
        this.setStaticOnce();
    }

    /**
     * 是否拥有属性
     * @param propName  属性名
     * @param isExpr    是否只检查表达式属性
     */
    public hasProp(propName: string) {
        if(this.props){
            return this.props.has(propName);
        }
    }

    /**
     * 获取属性值
     * @param propName  属性名
     * @param isExpr    是否只获取表达式属性
     */
    public getProp(propName: string,isExpr?:boolean) {
        if(this.props){
            return this.props.get(propName);
        }
    }

    /**
     * 设置属性值
     * @param propName  属性名
     * @param v         属性值
     */
    public setProp(propName: string, v: any) {
        if(!this.props){
            this.props = new Map();
        }
        this.props.set(propName,v);
    }

    /**
     * 删除属性
     * @param props     属性名或属性名数组 
     */
    public delProp(props: string | string[]) {
        if(!this.props){
            return;
        }
        if (Util.isArray(props)) {
            for (let p of <string[]>props) {
                this.props.delete(p);
            }
        } else {
            this.props.delete(<string>props);
        }
        //设置静态标志，至少要比较一次
        this.setStaticOnce();
    }

    /**
     * 设置asset
     * @param assetName     asset name
     * @param value         asset value
     */
    public setAsset(assetName: string, value: any) {
        if(!this.assets){
            this.assets = new Map();
        }
        this.assets.set(assetName, value);
    }

    /**
     * 删除asset
     * @param assetName     asset name
     */
    public delAsset(assetName: string) {
        if(!this.assets){
            return;
        }
        this.assets.delete(assetName);
    }

    

    /**
     * 添加事件
     * @param event     事件对象
     */
    public addEvent(event: NEvent) {
        if(!this.events){
            this.events = new Map();
        }
        if(!this.events.has(event.name)){
            this.events.set(event.name, [event.id]);
        }else{
            let arr = this.events.get(event.name);
            //已添加的事件，不再添加
            if(arr.indexOf(event.id) === -1){
                arr.push(event.id);
            }
        }
    }

    /**
     * 获取事件集
     * @param eventName     事件名
     * @returns             事件对象或事件对象数组
     */
    public getEvent(eventName:string):number[]{
        if(this.events){
            return this.events.get(eventName);
        }
    }

    /**
     * 设置事件集
     * @param eventName     事件名
     * @param events        事件数组
     */
    public setEvent(eventName:string,events:number[]){
        if(!this.events){
            this.events = new Map();
        }
        this.events.set(eventName,events);
    }

    /**
     * 获取html dom
     * @param module    模块 
     * @returns         对应的html dom
     */
    public getEl(module:Module):Node{
        return module.getNode(this.key);
    }

    /**
     * 查找子孙节点
     * @param key 	element key
     * @returns		虚拟dom/undefined
     */
    public query(key: string) {
        if (this.key === key) {
            return this;
        }
        if(this.children){
            for (let i = 0; i < this.children.length; i++) {
                let dom = this.children[i].query(key);
                if (dom) {
                    return dom;
                }
            }
        }
    }

    /**
     * 设置cache参数
     * @param module    模块
     * @param name      参数名
     * @param value     参数值
     */
    public setParam(module:Module,name:string,value:any){
        module.objectManager.setElementParam(this.key,name,value);
    }

    /**
     * 获取参数值
     * @param module    模块 
     * @param name      参数名
     * @returns         参数值
     */
    public getParam(module:Module,name:string){
        return module.objectManager.getElementParam(this.key,name);
    }

    /**
     * 移除参数
     * @param module    模块
     * @param name      参数名
     */
    public removeParam(module:Module,name:string){
        module.objectManager.removeElementParam(this.key,name);
    }

    /**
     * 设置单次静态标志
     */
    private setStaticOnce(){
        if(this.staticNum !== -1){
            this.staticNum = 1;
        }
    }

    /**
     * 克隆
     * @param changeKey     是否更改key，如果为true，则生成的节点用新的key
     */
     public clone(): VirtualDom {
        let dst: VirtualDom = new VirtualDom(this.tagName,this.key);
        if(this.tagName){
            //属性
            if(this.props && this.props.size>0){
                for(let p of this.props){
                    dst.setProp(p[0],p[1]);
                }
            }
            
            if(this.assets && this.assets.size>0){
                for(let p of this.assets){
                    dst.setAsset(p[0],p[1]);
                }
            }
            
            //事件
            if(this.events && this.events.size>0){
                for(let p of this.events){
                    //复制数组
                    dst.setEvent(p[0],p[1].slice(0));
                }    
            }
            
            if(this.directives && this.directives.length>0){
                dst.directives = [];
                for(let d of this.directives){
                    dst.directives.push(d.clone());
                }
            }
            
            //子节点clone
            if(this.children){
                for(let c of this.children){
                    dst.add(c.clone());
                }
            }
        }else{
            dst.expressions = this.expressions;
            dst.textContent = this.textContent;
        }
        dst.staticNum = this.staticNum;
        return dst;
    }
}