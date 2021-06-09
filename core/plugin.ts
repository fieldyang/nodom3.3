import { Element } from "./element";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { Util } from "./util";

/**
 * 插件，插件为自定义元素方式实现
 */
export class Plugin {
    /**
     * tag name
     */
    tagName:string;

    /**
     * 绑定的element
     */
    element:Element;

    /**
     * module id
     */
    moduleId:number;

    /**
     * model
     */
    model:Model;

    /**
     * 绑定的dom key
     */
    key:string;

    /**
     * 插件名，在module中唯一
     */
    name:string;

    /**
     * 是否需要前置渲染
     */
    needPreRender:boolean;

    /**
     * 附加数据项名
     */
    extraDataName:string;

    constructor(params:HTMLElement|Object){
        
    }
    
    /**
     * 前置渲染方法(dom render方法中获取modelId和parentKey后执行)
     * @param module    模块
     * @param uidom     虚拟dom
     */
    public beforeRender(module:Module,uidom:Element){
        this.element = uidom;
        this.moduleId = module.id;
        if(!this.model || uidom.key !== this.key){
            this.key = uidom.key;
            this.model = uidom.model;
            //添加到模块
            if(uidom.hasProp('name')){
                // module.addNPlugin(uidom.getProp('name'),this);       
            }
            this.needPreRender = true;    
        }else{
            this.needPreRender = false;
        }
    }
    /**
     * 后置渲染方法(dom render结束后，渲染到html之前)
     * @param module    模块
     * @param uidom     虚拟dom
     */
    public afterRender(module:Module,uidom:Element){}

    /**
     * 克隆
     */
    public clone(dst?:Element){
        let plugin = Reflect.construct(this.constructor,[]);
        //不拷贝属性
        let excludeProps:string[] = ['key','element','modelId','moduleId'];
        Util.getOwnProps(this).forEach((prop)=>{
            if(excludeProps.includes(prop)){
                return;
            }
            plugin[prop] = Util.clone(this[prop]);
        });
        if(dst){
            plugin.element = dst;
        }
        return plugin;
    }

    /**
     * 获取model
     */
    public getModel():Model{
        let module:Module = ModuleFactory.get(this.moduleId);
        if(!module){
            return null;
        }
        return this.model || null;
    }
}
