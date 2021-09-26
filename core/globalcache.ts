import { NCache } from "./cache";
import { Directive } from "./directive";
import { NEvent } from "./event";
import { Element } from "./element";
import { Expression } from "./expression";

/**
 * 全局缓存
 */
export class GlobalCache{
    private static cache:NCache = new NCache();

    /**
         * 保存到cache
         * @param key       键，支持"."
         * @param value     值
         */
    public static set(key:string,value:any){
        this.cache.set(key,value);
    }

    /**
     * 从cache读取
     * @param key   键，支持"."
     * @returns     缓存的值或undefined
     */
    public static get(key){
        return this.cache.get(key);
    }

    /**
     * 从cache移除
     * @param key   键，支持"."
     */
    public static remove(key){
        this.cache.remove(key);
    }

    /**
     * 获取指令实例
     * @param module    模块
     * @param id        指令id
     * @returns         指令对象
     */
    public static getDirective(id:number):Directive{
        return this.cache.get('$directives.' + id + '.$instance');
    }

    /**
     * 保存指令实例
     * @param module        模块
     * @param directive     指令对象
     */
    public static saveDirective(directive:Directive){
        this.cache.set('$directives.' + directive.id + '.$instance',directive);
    }

    /**
     * 移除指令
     * @param id    指令id
     */
    public static removeDirective(id:number){
        this.cache.remove('$directives.' + id);
    }

    /**
     * 设置指令参数
     * @param id        指令id
     * @param key       dom key
     * @param name      参数名  
     * @param value     参数值
     */
    public static setDirectiveParam(id:number,key:string,name:string,value:any){
        this.cache.set('$doms.' + key + '$directives.' + id + '.$params.' + name,value);
    }

    /**
     * 获取指令参数值
     * @param id        指令id
     * @param key       dom key
     * @param name      参数名
     * @returns         参数值
     */
    public static getDirectiveParam(id:number,key:string,name:string){
        return this.cache.get('$doms.' + key + '$directives.' + id + '.$params.' + name);
    }

    /**
     * 移除指令参数
     * @param id        指令id
     * @param key       dom key
     * @param name      参数名
     */
    public static removeDirectiveParam(id:number,key:string,name:string){
        this.cache.remove('$doms.' + key + '$directives.' + id + '.$params.' + name);
    }

    /**
     * 清空指令参数
     * @param id        指令id
     * @param key       dom key
     */
    public static clearDirectiveParam(id:number,key:string){
        this.cache.remove('$doms.' + key + '$directives.' + id + '.$params.' + name);
    }

    /**
     * 获取表达式实例
     * @param id        表达式id
     * @returns         表达式对象
     */
    public static getExpression(id:number):Expression{
        return this.cache.get('$expressions.' + id);
    }

    /**
     * 保存表达式实例
     * @param expression    表达式对象
     */
    public static saveExpression(expression:Expression){
        this.cache.set('$expressions.' + expression.id,expression);
    }

    /**
     * 移除表达式
     * @param id    表达式id
     */
    public static removeExpression(id:number){
        this.cache.remove('$expressions.' + id);
    }

    /**
     * 获取事件实例
     * @param id        表达式id
     * @returns         事件对象
     */
    public static getEvent(id:number):NEvent{
        return this.cache.get('$events.' + id + '.$instance');
    }

    /**
     * 保存事件实例
     * @param event     事件对象
     */
    public static saveEvent(event:NEvent){
        this.cache.set('$events.' + event.id + '.$instance',event);
    }

    /**
     * 移除事件
     * @param id    事件id
     */
    public static removeEvent(id:number){
        this.cache.remove('$events.' + id);
    }

    /**
     * 设置事件参数
     * @param id        事件id
     * @param key       dom key
     * @param name      参数名  
     * @param value     参数值
     */
    public static setEventParam(id:number,key:String,name:string,value:any){
        this.cache.set('$doms.' + key + '$events.' + id + '.$params.' + name,value);
    }

    /**
     * 获取事件参数值
     * @param id        事件id
     * @param key       dom key 
     * @param name      参数名
     * @returns         参数值
     */
    public static getEventParam(id:number,key:string,name:string){
        return this.cache.get('$doms.' + key + '$events.' + id + '.$params.' + name);
    }

    /**
     * 移除事件参数
     * @param id        事件id
     * @param key       dom key
     * @param name      参数名
     */
    public static removeEventParam(id:number,key:string,name:string){
        this.cache.remove('$doms.' + key + '$events.' + id + '.$params.' + name);
    }

    /**
     * 清空事件参数
     * @param id        事件id
     * @param key       dom key 
     */
    public static clearEventParam(id:number,key:string){
        this.cache.remove('$doms.' + key + '$events.' + id + '.$params');
    }

    /**
     * 保存旧虚拟dom
     * @param dom       dom对象
     */
    public static saveElement(dom:Element){
        this.cache.set('$doms.' + dom.key,dom);
    }
    /**
     * 获取渲染树虚拟dom
     * @param key       dom key
     * @returns         dom对象
     */
    public static getElement(key:string):Element{
        return this.cache.get('$doms.' + key);
    }

    /**
     * 删除渲染树虚拟dom
     * @param key       虚拟dom key
     */
    public static removeElement(key:string){
        this.cache.remove('$doms.' + key);
    }


    /**
     * 获取key对应的html节点
     * @param key       el key
     * @returns         html element
     */
    public static getNode(key: string): Node {
        return this.cache.get('$doms.' + key + '.$el');
    }

    /**
     * 保存key对应的html node
     * @param key       dom key
     * @param node      node
     */
    public static saveNode(key:string,node:Node){
        this.cache.set('$doms.' + key + '.$el',node);
    }

    /**
     * 移除保存的节点（包括参数和html dom）
     * @param key   dom key
     */
    public static removeSavedNode(key:string){
        this.cache.remove('$doms.' + key);
    }

    /**
     * 设置dom参数值
     * @param key       dom key 
     * @param name       参数名
     * @param value     参数值
     */
    public static setElementParam(key:string,name:string,value:any){
        this.cache.set('$doms.' + key + '.$params.' + name ,value);
    }

    /**
     * 获取dom参数值
     * @param key       dom key
     * @param name      参数名
     * @returns         参数值
     */
    public static getElementParam(key:string,name:string):any{
        return this.cache.get('$doms.' + key + '.$params.' + name);
    }

    /**
     * 移除dom参数
     * @param key       dom key
     * @param name      参数名
     */
    public static removeElementParam(key:string,name:string){
        this.cache.remove('$doms.' + key + '.$params.' + name);
    }

    /**
     * 清除element 参数集
     * @param key   dom key
     */
    public static clearElementParams(key:string){
        this.cache.remove('$doms.' + key + '.$params');
    }

    /**
     * 清除指令集
     */
    public static clearDirectives(){
        this.remove('$directives');
    }

    /**
     * 清除表达式集
     */
    public static clearExpressions(){
        this.remove('$directives');
    }

    /**
     * 清除事件集
     */   
    public static clearEvents(){
        this.remove('$directives');
    }

    /**
     * 清除缓存dom对象
     */
    public static clearSaveDoms(){
        this.remove('$doms');
    }
}