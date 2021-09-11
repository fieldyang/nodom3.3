import { Router } from "./router";
import { IRouteCfg } from "./types";
import { Util } from "./util";

/**
 * 路由类
 */
 export class Route {
    /**
     * 路由id
     */
    id:number;
    /**
     * 路由参数名数组
     */
    params:Array<string> = [];
    /**
     * 路由参数数据
     */
    data:any = {};
    /**
     * 子路由
     */
    children:Array<Route> = [];
    /**
     * 进入路由事件方法
     */
    onEnter:Function;
    /**
     * 离开路由方法
     */
    onLeave:Function;
    /**
     * 是否使用父路由路径
     */
    useParentPath:boolean;
    /**
     * 路由路径
     */
    path:string;
    /**
     * 完整路径
     */
    fullPath:string;

    /**
     * 路由对应模块对象或类或模块类名
     */
    module:any;
    
    /**
     * 模块路径，当module为类名时需要，默认执行延迟加载
     */
    modulePath:string;

    /**
     * 父路由
     */
    parent:Route;

    /**
     * 
     * @param config 路由配置项
     */
    constructor(config?:IRouteCfg) {
        if (!config || Util.isEmpty(config.path)) {
            return;
        }
        //参数赋值
        for(let o in config){
            this[o] = config[o];   
        }
        this.id = Util.genId();
        Router.addRoute(this, config.parent);
        //子路由
        if (config.routes && Array.isArray(config.routes)) {
            config.routes.forEach((item) => {
                item.parent = this;
                new Route(item);
            });
        }
    }
    
    /**
     * 添加子路由
     * @param child 
     */
    addChild(child:Route){
        this.children.push(child);
        child.parent = this;
    }

    /**
     * 克隆
     * @returns 克隆对象
     */
    clone(){
        let r = new Route();
        Object.getOwnPropertyNames(this).forEach(item=>{
            if(item === 'data'){    
                return;
            }
            r[item] = this[item];
        });
        if(this.data){
            r.data = Util.clone(this.data);
        }
        return r;
    }
}