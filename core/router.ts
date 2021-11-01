import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { Renderer } from "./renderer";
import { Route } from "./route";
import { Util } from "./util";

/**
 * 路由管理类
 * @since 	1.0
 */
export class Router {
    /**
     * 路由map
     */
    static routeMap:Map<number,Route> = new Map();
    /**
     * 当前路径
     */
    static currentPath:string;
    
    /**
     * path等待链表
     */
    static waitList:Array<string> = []; 
    
    /**
     * 默认路由进入事件方法
     */
    static onDefaultEnter:Function;
    /**
     * 默认路由离开事件
     */
    static onDefaultLeave:Function; 
    
    /**
     * 启动方式 0:直接启动 1:popstate 启动
     */
    static startStyle:number = 0;

    /**
     * 激活Dom map，格式为{moduleId:[]}
     */
    static activeFieldMap:Map<number,Array<any>> = new Map();

    /**
     * 绑定到module的router指令对应的key，即router容器对应的key，格式为 {moduleId:routerKey,...}
     */
    static routerKeyMap:Map<number,string> = new Map();

    /**
     * 根路由
     */
    static root:Route;
    
    /**
     * 把路径加入跳转列表(准备跳往该路由)
     * @param path 	路径 
     */
    static go(path:string) {
        //相同路径不加入
        if(path === this.currentPath){
            return;
        }
        
        //添加路径到等待列表，已存在，不加入
        if(this.waitList.indexOf(path) === -1){
            this.waitList.push(path);
        }

        //延迟加载，避免同一个路径多次加入
        setTimeout(()=>{
            this.load();
        },0);
    }

    /**
     * 启动加载
     */
    private static load() {
        //在加载，或无等待列表，则返回
        if (this.waitList.length === 0) {
            return;
        }
        
        let path:string = this.waitList.shift();
        this.start(path).then(()=>{
            //继续加载
            this.load();
        });
    }

    /**
     * 切换路由
     * @param path 	路径
     */
    private static async start(path:string) {
        let diff = this.compare(this.currentPath, path);
        // 当前路由依赖的容器模块
        let parentModule:Module;
        if(diff[0] === null){
            parentModule = ModuleFactory.getMain();
        }else{
            parentModule = await this.getModule(diff[0]);
        }
        
        //onleave事件，从末往前执行
        for (let i = diff[1].length - 1; i >= 0; i--) {
            const r = diff[1][i];
            if (!r.module) {
                continue;
            }
            let module:Module = await this.getModule(r);
            if (Util.isFunction(this.onDefaultLeave)) {
                this.onDefaultLeave(module.model);
            }
            if (Util.isFunction(r.onLeave)) {
                r.onLeave(module.model);
            }
            // 清理map映射
            this.activeFieldMap.delete(module.id);
            //module置为不激活
            module.unactive();
        }
        if (diff[2].length === 0) { //路由相同，参数不同
            let route:Route = diff[0];
            if (route !== null) {
                let module:Module = await this.getModule(route);
                // 模块处理
                this.dependHandle(module,route,diff[3]?diff[3].module:null);
            }
        } else { //路由不同
            //加载模块
            for (let ii = 0; ii < diff[2].length; ii++) {
                let route:Route = diff[2][ii];

                //路由不存在或路由没有模块（空路由）
                if (!route || !route.module) {
                    continue;
                }
                
                let module:Module = await this.getModule(route);
                
                // 模块处理
                this.dependHandle(module,route,parentModule);
                //默认全局路由enter事件
                if (Util.isFunction(this.onDefaultEnter)) {
                    this.onDefaultEnter(module.model);
                }
                //当前路由进入事件
                if (Util.isFunction(route.onEnter)) {
                    route.onEnter(module.model);
                }
                parentModule = module;
            }
        }
        
        //如果是history popstate，则不加入history
        if (this.startStyle === 0) {
            //子路由，替换state
            if (path.startsWith(this.currentPath)) {
                history.replaceState(path, '', path);
            } else { //路径push进history
                history.pushState(path, '', path);
            }
        }
        //修改currentPath
        this.currentPath = path;
        //设置start类型为正常start
        this.startStyle = 0;
    }

    /*
     * 重定向
     * @param path 	路径
     */
    public static redirect(path:string) {
        this.go(path);
    }

    /**
     * 获取module
     * @param route 路由对象 
     * @returns     路由对应模块
     */
    private static async getModule(route:Route){
        let module = route.module;
        //已经是模块实例
        if(typeof module === 'object'){
            return module;
        }
        //延迟加载
        if(typeof module === 'string' && route.modulePath){ //模块路径
            module = await import(route.modulePath);
            module = module[route.module];
        }
         //模块类
        if(typeof module === 'function'){ 
            module = ModuleFactory.get(module);
        }
        route.module = module;
        return module;
    }
    /**
     * 比较两个路径对应的路由链
     * @param path1 	第一个路径
     * @param path2 	第二个路径
     * @returns 		数组 [父路由或不同参数的路由，第一个需要销毁的路由数组，第二个需要增加的路由数组，不同参数路由的父路由]
     */
    private static compare(path1:string, path2:string):Array<any> {
        // 获取路由id数组
        let arr1:Array<Route> = null;
        let arr2:Array<Route> = null;

        if (path1) {
            //采用克隆方式复制，避免被第二个路径返回的路由覆盖参数
            arr1 = this.getRouteList(path1,true);
        }
        if (path2) {
            arr2 = this.getRouteList(path2);
        }

        let len = 0;
        if (arr1 !== null) {
            len = arr1.length;
        }

        if (arr2 !== null) {
            if (arr2.length < len) {
                len = arr2.length;
            }
        } else {
            len = 0;
        }
        //需要销毁的旧路由数组
        let retArr1 = [];
        //需要加入的新路由数组
        let retArr2 = [];
        let i = 0;
        for (i = 0; i < len; i++) {
            //找到不同路由开始位置
            if (arr1[i].id === arr2[i].id) {
                //比较参数
                if (JSON.stringify(arr1[i].data) !== JSON.stringify(arr2[i].data)) {
                    i++;
                    break;
                }
            } else {
                break;
            }
        }
        
        //旧路由改变数组
        if (arr1 !== null) {
            retArr1 = arr1.slice(i);
        }
        
        //新路由改变数组（相对于旧路由）
        if (arr2 !== null) {
            retArr2 = arr2.slice(i);
        }
        
        //上一级路由或参数不同的当前路由
        let p1:Route = null;
        //上二级路由或参数不同路由的上一级路由
        let p2:Route = null;
        if(arr2 && i>0){
            // 可能存在空路由，需要向前遍历
            for (let j=i-1;j>=0; j--) {
                if(!p1){
                    if (arr2[j].module) {
                        p1 = arr2[j];
                        continue;
                    }
                }else if(!p2){
                    if (arr2[j].module) {
                        p2 = arr2[j];
                        break;
                    }
                }
            }
        }
        return [p1, retArr1, retArr2,p2];
    }

    /**
     * 添加激活字段
     * @param module    模块 
     * @param path      路由路径
     * @param model     激活字段所在model
     * @param field     字段名
     */
    public static addActiveField(module:Module,path:string,model:any,field:string){
        if(!model || !field){
            return;
        }
        let arr = Router.activeFieldMap.get(module.id);
        if(!arr){  //尚未存在，新建
            Router.activeFieldMap.set(module.id, [{path:path,model:model,field:field}]);
        }else if(arr.find(item=>item.model===model&&item.field===field) === undefined){  //不重复添加
            arr.push({path:path,model:model,field:field});
        }
    }

    /**
     * 依赖模块相关处理
     * @param module 	模块
     * @param pm        依赖模块
     * @param path 		view对应的route路径
     */
    private static dependHandle(module:Module,route:Route,pm:Module){
        const me = this;
        //激活
        module.active();
        //设置参数
        let o = {
            path: route.path
        };
        if (!Util.isEmpty(route.data)) {
            o['data'] = route.data;
        }
        module.model['$route'] = o;
        if(pm){
            if(pm.state === 2){  //被依赖模块处于渲染后状态
                module.setContainer(<HTMLElement>pm.getNode(Router.routerKeyMap.get(pm.id)));
                this.setDomActive(pm,route.fullPath);
            }else{ //被依赖模块不处于被渲染后状态
                pm.addRenderOps(function(m,p){
                    module.setContainer(<HTMLElement>m.getNode(Router.routerKeyMap.get(m.id)));
                    me.setDomActive(m,p);
                },1,[pm,route.fullPath],true);
            }
        }
    }

    /**
     * 设置路由元素激活属性
     * @param module    模块 
     * @param path      路径
     * @returns 
     */
    private static setDomActive(module:Module,path:string){
        let arr = Router.activeFieldMap.get(module.id);
        if(!arr){
            return;
        }
        for(let o of arr){
            o.model[o.field] = o.path === path;
        }
    }

    /**
     * 添加路由
     * @param route 	路由配置 
     * @param parent 	父路由 
     */
     static addRoute(route:Route, parent:Route) {
        //建立根(空路由)
        if(!this.root){
            this.root = new Route();
        }
        
        let pathArr:Array<string> = route.path.split('/');
        let node:Route = parent || this.root;
        let param:Array<string> = [];
        let paramIndex:number = -1; //最后一个参数开始
        let prePath:string = '';    //前置路径
        for (let i = 0; i < pathArr.length; i++) {
            let v = pathArr[i].trim();
            if (v === '') {
                pathArr.splice(i--, 1);
                continue;
            }

            if (v.startsWith(':')) { //参数
                if (param.length === 0) {
                    paramIndex = i;
                }
                param.push(v.substr(1));
            } else {
                paramIndex = -1;
                param = []; //上级路由的参数清空
                route.path = v; //暂存path
                let j = 0;
                for (; j < node.children.length; j++) {
                    let r = node.children[j];
                    if (r.path === v) {
                        node = r;
                        break;
                    }
                }

                //没找到，创建新节点
                if (j === node.children.length) {
                    if (prePath !== '') {
                        new Route({ path: prePath, parent:node });
                        node = node.children[node.children.length - 1];
                    }
                    prePath = v;
                }
            }

            //不存在参数
            if (paramIndex === -1) {
                route.params = [];
            } else {
                route.params = param;
            }
        }

        //添加到树
        if (node !== undefined && node !== route) {
            route.path = prePath;
            node.addChild(route);
        }
        
        // 添加到路由map    
        this.routeMap.set(route.id, route);
    }

    /**
     * 获取路由数组
     * @param path 	要解析的路径
     * @param clone 是否clone，如果为false，则返回路由树的路由对象，否则返回克隆对象
     * @returns     路由对象数组
     */
    static getRouteList(path:string,clone?:boolean):Array<Route> {
        if(!this.root){
            return[];
        }
        let pathArr:string[] = path.split('/');
        let node:Route = this.root;
        
        let paramIndex:number = 0;      //参数索引
        let retArr:Array<Route> = [];
        let fullPath:string = '';       //完整路径
        let preNode:Route = this.root;  //前一个节点

        for (let i = 0; i < pathArr.length; i++) {
            let v:string = pathArr[i].trim();
            if (v === '') {
                continue;
            }
            let find:boolean = false;
            for (let j=0; j<node.children.length; j++) {
                if (node.children[j].path === v) {
                    //设置完整路径
                    if (preNode !== this.root) {
                        preNode.fullPath = fullPath;
                        preNode.data = node.data;
                        retArr.push(preNode);
                    }

                    //设置新的查找节点
                    node = clone?node.children[j].clone():node.children[j];
                    //参数清空
                    node.data = {};
                    preNode = node;
                    find = true;
                    //参数索引置0
                    paramIndex = 0;
                    break;
                }
            }
            //路径叠加
            fullPath += '/' + v;
            //不是孩子节点,作为参数
            if (!find) {
                if (paramIndex < node.params.length) { //超出参数长度的废弃
                    node.data[node.params[paramIndex++]] = v;
                }
            }
        }

        //最后一个节点
        if (node !== this.root) {
            node.fullPath = fullPath;
            retArr.push(node);
        }
        return retArr;
    }
}

//处理popstate事件
window.addEventListener('popstate', function (e) {
    //根据state切换module
    const state = history.state;
    if (!state) {
        return;
    }
    Router.startStyle = 1;
    Router.go(state);
});