import { NCache } from "./cache";
import { Directive } from "./directive";
import { Element } from "./element";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { GlobalCache } from "./globalcache";
import { Module } from "./module";
import { Util } from "./util";

/**
 * 指令管理器
 * $directives  指令集
 * $expressions 表达式集
 * $events      事件集
 * $savedoms    dom相关缓存 包括 html dom 和 参数
 * $doms        渲染树
 */
export  class ObjectManager {
    /**
     * cache
     */
    public cache:NCache;

    /**
     * 模块
     */
    public module:Module;
    /**
     * module   模块
     * @param module 
     */
    constructor(module:Module){
        this.module = module;
        this.cache = new NCache();
    }

    /**
     * 保存到cache
     * @param key       键，支持"."
     * @param value     值
     */
     public set(key:string,value:any){
        this.cache.set(key,value);
    }

    /**
     * 从cache读取
     * @param key   键，支持"."
     * @returns     缓存的值或undefined
     */
    public get(key){
        return this.cache.get(key);
    }

    /**
     * 从cache移除
     * @param key   键，支持"."
     */
    public remove(key){
        this.cache.remove(key);
    }

    /**
     * 获取指令实例
     * @param module    模块
     * @param id        指令id
     * @returns         指令对象
     */
    public getDirective(id:number):Directive{
        let d = this.cache.get('$directives.' + id + '.$instance');
        if(!d){
            d = GlobalCache.get('$directives.' + id);
            GlobalCache.removeDirective(id);
            if(d){
                this.cache.set('$directives.' + id,d);
                return d.$instance;
            }
        }
        return d;
    }

    /**
     * 保存指令实例
     * @param module        模块
     * @param directive     指令对象
     */
    public saveDirective(directive:Directive){
        this.cache.set('$directives.' + directive.id + '.$instance',directive);
    }

    /**
     * 移除指令
     * @param id    指令id
     */
    public removeDirective(id:number){
        this.cache.remove('$directives.' + id);
    }

    /**
     * 设置指令参数
     * @param id        指令id
     * @param key       dom key
     * @param name      参数名  
     * @param value     参数值
     */
    public setDirectiveParam(id:number,key:string,name:string,value:any){
        this.cache.set('$doms.' + key + '$directives.' + id + '.$params.' + name,value);
    }

    /**
     * 获取指令参数值
     * @param id        指令id
     * @param key       dom key
     * @param name      参数名
     * @returns         参数值
     */
    public getDirectiveParam(id:number,key:string,name:string){
        return this.cache.get('$doms.' + key + '$directives.' + id + '.$params.' + name);
    }

    /**
     * 移除指令参数
     * @param id        指令id
     * @param key       dom key
     * @param name      参数名
     */
    public removeDirectiveParam(id:number,key:string,name:string){
        this.cache.remove('$doms.' + key + '$directives.' + id + '.$params.' + name);
    }

    /**
     * 清空指令参数
     * @param id        指令id
     * @param key       dom key
     */
    public clearDirectiveParam(id:number,key:string){
        this.cache.remove('$doms.' + key + '$directives.' + id + '.$params.' + name);
    }

    /**
     * 获取表达式实例
     * @param id        表达式id
     * @returns         表达式对象
     */
    public getExpression(id:number):Expression{
        let ex = this.cache.get('$expressions.' + id);
        if(!ex){
            ex = GlobalCache.get('$expressions.' + id);
            GlobalCache.removeExpression(id);
            if(ex){
                this.cache.set('$expressions.' + id,ex);
                return ex;
            }
        }
        return ex;
    }

    /**
     * 保存表达式实例
     * @param expression    表达式对象
     */
    public saveExpression(expression:Expression){
        this.cache.set('$expressions.' + expression.id,expression);
    }

    /**
     * 移除表达式
     * @param id    表达式id
     */
    public removeExpression(id:number){
        this.cache.remove('$expressions.' + id);
    }

    /**
     * 获取事件实例
     * @param id        表达式id
     * @returns         事件对象
     */
    public getEvent(id:number):NEvent{
        let ev = this.cache.get('$events.' + id + '.$instance')
        if(!ev){
            ev = GlobalCache.get('$events.' + id);
            GlobalCache.removeEvent(id);
            if(ev){
                this.cache.set('$events.' + id,ev);
                return ev.$instance;
            }
            
        }
        return ev;
    }

    /**
     * 保存事件实例
     * @param event     事件对象
     */
    public saveEvent(event:NEvent){
        this.cache.set('$events.' + event.id + '.$instance',event);
    }

    /**
     * 移除事件
     * @param id    事件id
     */
    public removeEvent(id:number){
        this.cache.remove('$events.' + id);
    }

    /**
     * 设置事件参数
     * @param id        事件id
     * @param key       dom key
     * @param name      参数名  
     * @param value     参数值
     */
    public setEventParam(id:number,key:String,name:string,value:any){
        this.cache.set('$doms.' + key + '$events.' + id + '.$params.' + name,value);
    }

    /**
     * 获取事件参数值
     * @param id        事件id
     * @param key       dom key 
     * @param name      参数名
     * @returns         参数值
     */
    public getEventParam(id:number,key:string,name:string){
        return this.cache.get('$doms.' + key + '$events.' + id + '.$params.' + name);
    }

    /**
     * 移除事件参数
     * @param id        事件id
     * @param key       dom key
     * @param name      参数名
     */
    public removeEventParam(id:number,key:string,name:string){
        this.cache.remove('$doms.' + key + '$events.' + id + '.$params.' + name);
    }

    /**
     * 清空事件参数
     * @param id        事件id
     * @param key       dom key 
     */
    public clearEventParam(id:number,key:string){
        this.cache.remove('$doms.' + key + '$events.' + id + '.$params');
    }

    /**
     * 获取旧虚拟dom
     * @param dom       dom对象
     */
    public saveElement(dom:Element){
        this.cache.set('$doms.' + dom.key,dom);
    }
    /**
     * 获取渲染树虚拟dom
     * @param key       dom key
     * @returns         dom对象
     */
    public getElement(key:string):Element{
        return this.cache.get('$doms.' + key);
    }

    /**
     * 删除渲染树虚拟dom
     * @param key       虚拟dom key
     */
     public removeElement(key:string){
        this.cache.remove('$doms.' + key);
    }


    /**
     * 获取key对应的html节点
     * @param key       el key
     * @returns         html element
     */
    public getNode(key: string): Node {
        // console.log('get',this.module,this.module.id,this.id,key,this.cache.get('$doms.' + key + '.$el'));
        return this.cache.get('$doms.' + key + '.$el');
    }

    /**
     * 保存key对应的html node
     * @param key       dom key
     * @param node      node
     */
    public saveNode(key:string,node:Node){
        this.cache.set('$doms.' + key + '.$el',node);
        // console.log('save',this.module,this.module.id,this.id,key,node);
    }

    /**
     * 移除保存的节点（包括参数和html dom）
     * @param key   dom key
     */
    public removeSavedNode(key:string){
        this.cache.remove('$doms.' + key);
    }

    /**
     * 设置dom参数值
     * @param key       dom key 
     * @param name       参数名
     * @param value     参数值
     */
    public setElementParam(key:string,name:string,value:any){
        this.cache.set('$doms.' + key + '.$params.' + name ,value);
    }

    /**
     * 获取dom参数值
     * @param key       dom key
     * @param name      参数名
     * @returns         参数值
     */
    public getElementParam(key:string,name:string):any{
        return this.cache.get('$doms.' + key + '.$params.' + name);
    }

    /**
     * 移除dom参数
     * @param key       dom key
     * @param name      参数名
     */
    public removeElementParam(key:string,name:string){
        this.cache.remove('$doms.' + key + '.$params.' + name);
    }

    /**
     * 清除element 参数集
     * @param key   dom key
     */
    public clearElementParams(key:string){
        this.cache.remove('$doms.' + key + '.$params');
    }

    /**
     * 清除指令集
     */
    public clearDirectives(){
        this.remove('$directives');
    }

    /**
     * 清除表达式集
     */
    public clearExpressions(){
        this.remove('$directives');
    }

    /**
     * 清除事件集
     */   
    public clearEvents(){
        this.remove('$directives');
    }

    /**
     * 清除缓存dom对象
     */
    public clearSaveDoms(){
        this.remove('$doms');
    }

}
